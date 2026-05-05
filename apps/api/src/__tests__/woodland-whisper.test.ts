/**
 * End-to-end integration tests for the Woodland Whisper API.
 *
 * Tests use Elysia's `.handle()` to exercise the full request/response
 * pipeline (routing, schema validation, error handling) without a real
 * network socket.  Where the outcome depends on a seeded RNG, we bypass
 * the random path by injecting deterministic state directly into the
 * session store.
 */
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { Wager } from '@tgslots/slots-core/betting'
import type {
  FreeSpinState,
  PickBonusState,
  WoodlandWhisperState,
} from '@tgslots/woodland-whisper/game-state-machine'
import { BET_CONFIG } from '@tgslots/woodland-whisper/constants'
import { woodlandWhisperRouter } from '../woodland-whisper.js'
import { createSession } from '../sessions.js'

// ─── App fixture ────────────────────────────────────────────────────────────

const app = new Elysia().use(woodlandWhisperRouter)

async function post(path: string, body: unknown): Promise<{ status: number; body: any }> {
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
  return { status: res.status, body: await res.json() }
}

async function get(path: string): Promise<{ status: number; body: any }> {
  const res = await app.handle(new Request(`http://localhost${path}`))
  return { status: res.status, body: await res.json() }
}

// ─── Deterministic state builders ───────────────────────────────────────────

// A known wager used for all injected states
const WAGER = new Wager(1, BET_CONFIG)

// Board: 20 cards, 10 distinct values each appearing twice
const BOARD: number[] = [10, 8, 10, 8, 15, 15, 20, 20, 30, 30, 50, 50, 75, 75, 100, 100, 13, 13, 9, 9]

// Sequence that reaches match on the 4th reveal:
//   pos 4 → 15 (new)
//   pos 7 → 20 (new)
//   pos 0 → 10 (new)
//   pos 2 → 10 (repeat = match, winValue = 10)
const PICK_SEQUENCE_TO_MATCH_AT_4 = [4, 7, 0, 2]

// Sequence that matches on the 2nd reveal:
//   pos 0 → 10 (new)
//   pos 2 → 10 (repeat = match)
const PICK_SEQUENCE_TO_MATCH_AT_2 = [0, 2]

function makePickBonusState(overrides: Partial<PickBonusState> = {}): PickBonusState {
  return {
    board: BOARD,
    pickSequence: PICK_SEQUENCE_TO_MATCH_AT_4,
    currentPickIndex: 0,
    userPicks: [],
    revealedValues: [],
    winValue: 10,
    triggeringWager: WAGER,
    ...overrides,
  }
}

function makeFreeSpinState(overrides: Partial<FreeSpinState> = {}): FreeSpinState {
  return {
    triggeringWager: WAGER,
    totalWin: 0,
    spinsRemaining: 5,
    ...overrides,
  }
}

function injectState(machine: any, partial: Partial<WoodlandWhisperState>): void {
  machine._state = {
    lastGrid: null,
    freeSpins: null,
    pickBonus: null,
    ...partial,
  }
}

// ─── Session management ──────────────────────────────────────────────────────

describe('Session management', () => {
  it('POST /spin without sessionId creates a new session and returns sessionId', async () => {
    const { status, body } = await post('/woodlandwhisper/spin', { multiplier: 1 })
    expect(status).toBe(200)
    expect(typeof body.sessionId).toBe('string')
    expect(body.sessionId.length).toBeGreaterThan(0)
    expect(body.result).toBeDefined()
    expect(body.state).toBeDefined()
  })

  it('POST /spin with valid sessionId reuses the same session', async () => {
    const first = await post('/woodlandwhisper/spin', { multiplier: 1 })
    const sessionId: string = first.body.sessionId

    const second = await post('/woodlandwhisper/spin', { multiplier: 1, sessionId })
    expect(second.status).toBe(200)
    expect(second.body.sessionId).toBe(sessionId)
  })

  it('POST /spin with unknown sessionId returns 404', async () => {
    const { status, body } = await post('/woodlandwhisper/spin', {
      multiplier: 1,
      sessionId: 'does-not-exist',
    })
    expect(status).toBe(404)
    expect(typeof body.error).toBe('string')
  })

  it('GET /state with valid sessionId returns state and sessionId', async () => {
    const spin = await post('/woodlandwhisper/spin', { multiplier: 1 })
    const sessionId: string = spin.body.sessionId

    const { status, body } = await get(`/woodlandwhisper/state?sessionId=${sessionId}`)
    expect(status).toBe(200)
    expect(body.sessionId).toBe(sessionId)
    expect(body.state).toBeDefined()
    expect('freeSpins' in body.state).toBe(true)
    expect('pickBonus' in body.state).toBe(true)
  })

  it('GET /state with unknown sessionId returns 404', async () => {
    const { status } = await get('/woodlandwhisper/state?sessionId=ghost')
    expect(status).toBe(404)
  })

  it('each POST /spin without sessionId creates a distinct session', async () => {
    const a = await post('/woodlandwhisper/spin', { multiplier: 1 })
    const b = await post('/woodlandwhisper/spin', { multiplier: 1 })
    expect(a.body.sessionId).not.toBe(b.body.sessionId)
  })
})

// ─── Base spin structure ─────────────────────────────────────────────────────

describe('POST /spin — base game response structure', () => {
  it('returns type BASE with a 3×5 grid', async () => {
    const { body } = await post('/woodlandwhisper/spin', { multiplier: 1 })
    expect(body.result.type).toBe('BASE')
    expect(body.result.grid).toHaveLength(3)
    expect(body.result.grid[0]).toHaveLength(5)
  })

  it('win and scatterWin are non-negative numbers', async () => {
    const { body } = await post('/woodlandwhisper/spin', { multiplier: 1 })
    expect(typeof body.result.win).toBe('number')
    expect(body.result.win).toBeGreaterThanOrEqual(0)
    expect(typeof body.result.scatterWin).toBe('number')
    expect(body.result.scatterWin).toBeGreaterThanOrEqual(0)
  })

  it('sc reflects the number of scatter symbols on the grid', async () => {
    const { body } = await post('/woodlandwhisper/spin', { multiplier: 1 })
    expect(typeof body.result.sc).toBe('number')
    expect(body.result.sc).toBeGreaterThanOrEqual(0)
    expect(body.result.sc).toBeLessThanOrEqual(5)
  })

  it('state.freeSpinsLeft and totalFreeSpinWin are present in result', async () => {
    const { body } = await post('/woodlandwhisper/spin', { multiplier: 1 })
    expect(typeof body.result.state.freeSpinsLeft).toBe('number')
    expect(typeof body.result.state.totalFreeSpinWin).toBe('number')
  })

  it('when no features are triggered, top-level state has null freeSpins and pickBonus', async () => {
    // Run up to 50 spins on a fresh session until we find one with no trigger
    let cleanBody: any
    for (let i = 0; i < 50; i++) {
      const { body } = await post('/woodlandwhisper/spin', { multiplier: 1 })
      if (!body.result.triggeredPickBonus) {
        cleanBody = body
        break
      }
    }
    expect(cleanBody).toBeDefined()
    expect(cleanBody.state.freeSpins).toBeNull()
    expect(cleanBody.state.pickBonus).toBeNull()
  })
})

// ─── Pick bonus state transitions ────────────────────────────────────────────

describe('Pick bonus — state transitions', () => {
  it('injected pickBonus is visible via GET /state', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    const { status, body } = await get(`/woodlandwhisper/state?sessionId=${id}`)
    expect(status).toBe(200)
    expect(body.state.pickBonus).not.toBeNull()
    expect(body.state.pickBonus.board).toHaveLength(20)
    expect(body.state.pickBonus.currentPickIndex).toBe(0)
  })

  it('first pick reveals predetermined index from pickSequence, ignoring userIndex', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    // User taps card 19 — but pickSequence[0]=4, so board[4]=15 is revealed
    const { status, body } = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 19 })
    expect(status).toBe(200)
    expect(body.result.type).toBe('PICK')
    expect(body.result.pick.userIndex).toBe(19)
    expect(body.result.pick.revealedIndex).toBe(4)
    expect(body.result.pick.value).toBe(15)
    expect(body.result.pick.isMatch).toBe(false)
    expect(body.result.pick.board).toEqual(BOARD)
  })

  it('consecutive picks follow pickSequence and accumulate userPicks', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    const r0 = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 3 })
    const r1 = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 7 })

    // sequence: pos4→15 then pos7→20
    expect(r0.body.result.pick.revealedIndex).toBe(4)
    expect(r0.body.result.pick.value).toBe(15)
    expect(r1.body.result.pick.revealedIndex).toBe(7)
    expect(r1.body.result.pick.value).toBe(20)

    // state accumulates userPicks and advances currentPickIndex
    expect(r1.body.state.pickBonus.currentPickIndex).toBe(2)
    expect(r1.body.state.pickBonus.userPicks).toEqual([3, 7])
    expect(r1.body.state.pickBonus.revealedValues).toEqual([15, 20])
  })

  it('non-matching pick keeps pickBonus active and freeSpins null', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    const { body } = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    expect(body.result.pick.isMatch).toBe(false)
    expect(body.state.pickBonus).not.toBeNull()
    expect(body.state.freeSpins).toBeNull()
  })

  it('matching pick clears pickBonus and activates freeSpins with winValue as spinsRemaining', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    // Play through all 4 picks: 15, 20, 10, 10(match)
    await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    const { body } = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })

    expect(body.result.pick.isMatch).toBe(true)
    expect(body.result.pick.value).toBe(10) // winValue
    expect(body.state.pickBonus).toBeNull()
    expect(body.state.freeSpins).not.toBeNull()
    expect(body.state.freeSpins.spinsRemaining).toBe(10) // winValue = 10
    expect(body.state.freeSpins.totalWin).toBe(0)
  })

  it('match on second pick clears bonus after minimum reveals', async () => {
    const { id, machine } = createSession()
    injectState(machine, {
      pickBonus: makePickBonusState({ pickSequence: PICK_SEQUENCE_TO_MATCH_AT_2 }),
    })

    const r0 = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    expect(r0.body.result.pick.isMatch).toBe(false)
    expect(r0.body.state.pickBonus).not.toBeNull()

    const r1 = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    expect(r1.body.result.pick.isMatch).toBe(true)
    expect(r1.body.state.pickBonus).toBeNull()
    expect(r1.body.state.freeSpins.spinsRemaining).toBe(10)
  })

  it('retrigger during free spins adds winValue on top of existing spinsRemaining', async () => {
    const { id, machine } = createSession()
    // Active free spins (3 remaining) and a simultaneous pick bonus
    injectState(machine, {
      freeSpins: makeFreeSpinState({ spinsRemaining: 3, totalWin: 500 }),
      pickBonus: makePickBonusState({ pickSequence: PICK_SEQUENCE_TO_MATCH_AT_2 }),
    })

    await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    const { body } = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })

    expect(body.result.pick.isMatch).toBe(true)
    expect(body.state.freeSpins.spinsRemaining).toBe(13) // 3 existing + 10 winValue
    expect(body.state.freeSpins.totalWin).toBe(500)       // preserved
    expect(body.state.pickBonus).toBeNull()
  })

  it('pick board is included in each result and matches injected board', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    const { body } = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    expect(body.result.pick.board).toEqual(BOARD)
  })

  it('result state and subsequent GET /state are consistent after pick', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    const { body: pickBody } = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 5 })
    const { body: stateBody } = await get(`/woodlandwhisper/state?sessionId=${id}`)
    expect(stateBody.state).toEqual(pickBody.state)
  })

  it('POST /pick with out-of-bounds userIndex returns 400', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    const { status } = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 20 })
    expect(status).toBe(400)
  })

  it('POST /pick with no active pickBonus returns 400', async () => {
    const { id } = createSession()
    const { status, body } = await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    expect(status).toBe(400)
    expect(typeof body.error).toBe('string')
  })

  it('POST /pick with unknown sessionId returns 404', async () => {
    const { status } = await post('/woodlandwhisper/pick', {
      sessionId: 'no-such-session',
      userIndex: 0,
    })
    expect(status).toBe(404)
  })
})

// ─── Free spins state transitions ────────────────────────────────────────────

describe('Free spins — state transitions', () => {
  it('POST /freespin returns type FREE and decrements spinsRemaining', async () => {
    const { id, machine } = createSession()
    injectState(machine, { freeSpins: makeFreeSpinState({ spinsRemaining: 5 }) })

    const { status, body } = await post('/woodlandwhisper/freespin', { sessionId: id })
    expect(status).toBe(200)
    expect(body.result.type).toBe('FREE')
    expect(body.state.freeSpins.spinsRemaining).toBe(4)
  })

  it('free spin result contains grid, hits, sc, win, scatterWin', async () => {
    const { id, machine } = createSession()
    injectState(machine, { freeSpins: makeFreeSpinState() })

    const { body } = await post('/woodlandwhisper/freespin', { sessionId: id })
    expect(body.result.grid).toHaveLength(3)
    expect(body.result.grid[0]).toHaveLength(5)
    expect(Array.isArray(body.result.hits)).toBe(true)
    expect(typeof body.result.sc).toBe('number')
    expect(typeof body.result.win).toBe('number')
    expect(typeof body.result.scatterWin).toBe('number')
  })

  it('free spin totalWin accumulates across multiple spins', async () => {
    const { id, machine } = createSession()
    injectState(machine, { freeSpins: makeFreeSpinState({ spinsRemaining: 3 }) })

    const r0 = await post('/woodlandwhisper/freespin', { sessionId: id })
    const r1 = await post('/woodlandwhisper/freespin', { sessionId: id })

    const win0 = r0.body.result.win as number
    const win1 = r1.body.result.win as number

    expect(r1.body.state.freeSpins.totalWin).toBe(win0 + win1)
    expect(r1.body.state.freeSpins.spinsRemaining).toBe(1)
  })

  it('last free spin reaches spinsRemaining 0; freeSpins object stays until next spin', async () => {
    // The state machine decrements to 0 but does NOT null out freeSpins —
    // that only happens when spin() starts a new round.
    const { id, machine } = createSession()
    injectState(machine, { freeSpins: makeFreeSpinState({ spinsRemaining: 1 }) })

    const { body } = await post('/woodlandwhisper/freespin', { sessionId: id })
    expect(body.result.type).toBe('FREE')

    if (!body.result.retriggeredPickBonus) {
      // spinsRemaining reached 0; the freeSpins object persists with count 0
      expect(body.state.freeSpins.spinsRemaining).toBe(0)
    } else {
      // Retrigger added more spins — still active
      expect(body.state.freeSpins.spinsRemaining).toBeGreaterThan(0)
      expect(body.state.pickBonus).not.toBeNull()
    }
  })

  it('POST /freespin is rejected after spinsRemaining reaches 0', async () => {
    const { id, machine } = createSession()
    injectState(machine, { freeSpins: makeFreeSpinState({ spinsRemaining: 1 }) })

    const first = await post('/woodlandwhisper/freespin', { sessionId: id })
    expect(first.status).toBe(200)

    // If it retriggered we can't test the 0-remaining guard here — skip
    if (first.body.result.retriggeredPickBonus) return

    const second = await post('/woodlandwhisper/freespin', { sessionId: id })
    expect(second.status).toBe(400)
  })

  it('result state and subsequent GET /state are consistent after freespin', async () => {
    const { id, machine } = createSession()
    injectState(machine, { freeSpins: makeFreeSpinState() })

    const { body: fsBody } = await post('/woodlandwhisper/freespin', { sessionId: id })
    const { body: stateBody } = await get(`/woodlandwhisper/state?sessionId=${id}`)
    expect(stateBody.state).toEqual(fsBody.state)
  })

  it('POST /freespin with no freeSpins active returns 400', async () => {
    const { id } = createSession()
    const { status, body } = await post('/woodlandwhisper/freespin', { sessionId: id })
    expect(status).toBe(400)
    expect(typeof body.error).toBe('string')
  })

  it('POST /freespin with pickBonus active returns 400 (must resolve pick first)', async () => {
    const { id, machine } = createSession()
    injectState(machine, {
      freeSpins: makeFreeSpinState(),
      pickBonus: makePickBonusState(),
    })

    const { status } = await post('/woodlandwhisper/freespin', { sessionId: id })
    expect(status).toBe(400)
  })

  it('POST /freespin with unknown sessionId returns 404', async () => {
    const { status } = await post('/woodlandwhisper/freespin', { sessionId: 'no-such-session' })
    expect(status).toBe(404)
  })
})

// ─── POST /spin resets in-progress state ─────────────────────────────────────

describe('POST /spin — resets in-progress state', () => {
  it('new spin discards active freeSpins', async () => {
    const { id, machine } = createSession()
    injectState(machine, { freeSpins: makeFreeSpinState({ totalWin: 9999, spinsRemaining: 10 }) })

    const { body } = await post('/woodlandwhisper/spin', { sessionId: id, multiplier: 1 })
    expect(body.result.type).toBe('BASE')
    // Old totalWin must be gone; if this spin itself triggered pick bonus,
    // freeSpins will be null (pick bonus comes before free spins)
    if (!body.result.triggeredPickBonus) {
      expect(body.state.freeSpins).toBeNull()
    }
    // Old totalWin of 9999 must not appear in current freeSpins
    if (body.state.freeSpins) {
      expect(body.state.freeSpins.totalWin).not.toBe(9999)
    }
  })

  it('new spin discards active pickBonus', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState() })

    const { body } = await post('/woodlandwhisper/spin', { sessionId: id, multiplier: 1 })
    expect(body.result.type).toBe('BASE')
    if (!body.result.triggeredPickBonus) {
      expect(body.state.pickBonus).toBeNull()
    }
  })

  it('result state after spin reflects a fresh round (no stale totalWin)', async () => {
    const { id, machine } = createSession()
    injectState(machine, {
      freeSpins: makeFreeSpinState({ totalWin: 99999, spinsRemaining: 10 }),
      pickBonus: makePickBonusState(),
    })

    const { body } = await post('/woodlandwhisper/spin', { sessionId: id, multiplier: 1 })
    // totalFreeSpinWin in the result state must come from the new round only
    expect(body.result.state.totalFreeSpinWin).toBe(0)
    expect(body.result.state.freeSpinsLeft).toBe(0)
  })
})

// ─── State consistency: response vs GET /state ───────────────────────────────

describe('State consistency — response body vs GET /state', () => {
  it('state returned by POST /spin matches subsequent GET /state', async () => {
    const { body: spinBody } = await post('/woodlandwhisper/spin', { multiplier: 1 })
    const sessionId: string = spinBody.sessionId

    const { body: stateBody } = await get(`/woodlandwhisper/state?sessionId=${sessionId}`)
    expect(stateBody.state).toEqual(spinBody.state)
  })

  it('state is stable between consecutive GET /state calls without any action', async () => {
    const { id } = createSession()

    const a = await get(`/woodlandwhisper/state?sessionId=${id}`)
    const b = await get(`/woodlandwhisper/state?sessionId=${id}`)
    expect(a.body.state).toEqual(b.body.state)
  })

  it('state progresses correctly through full pick bonus → free spins sequence', async () => {
    const { id, machine } = createSession()
    injectState(machine, { pickBonus: makePickBonusState({ pickSequence: PICK_SEQUENCE_TO_MATCH_AT_2 }) })

    // Before any picks: pickBonus active, freeSpins null
    const s0 = await get(`/woodlandwhisper/state?sessionId=${id}`)
    expect(s0.body.state.pickBonus).not.toBeNull()
    expect(s0.body.state.freeSpins).toBeNull()

    // First pick: no match yet
    await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    const s1 = await get(`/woodlandwhisper/state?sessionId=${id}`)
    expect(s1.body.state.pickBonus).not.toBeNull()
    expect(s1.body.state.pickBonus.currentPickIndex).toBe(1)
    expect(s1.body.state.freeSpins).toBeNull()

    // Second pick: match — pickBonus clears, freeSpins starts
    await post('/woodlandwhisper/pick', { sessionId: id, userIndex: 0 })
    const s2 = await get(`/woodlandwhisper/state?sessionId=${id}`)
    expect(s2.body.state.pickBonus).toBeNull()
    expect(s2.body.state.freeSpins.spinsRemaining).toBe(10)

    // Play one free spin
    await post('/woodlandwhisper/freespin', { sessionId: id })
    const s3 = await get(`/woodlandwhisper/state?sessionId=${id}`)
    expect(s3.body.state.freeSpins.spinsRemaining).toBe(9)
  })
})

// ─── Input validation ────────────────────────────────────────────────────────

describe('Input validation', () => {
  it('POST /spin with fractional multiplier is rejected', async () => {
    const { status } = await post('/woodlandwhisper/spin', { multiplier: 1.5 })
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('POST /spin with multiplier 0 is rejected', async () => {
    const { status } = await post('/woodlandwhisper/spin', { multiplier: 0 })
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('POST /spin with negative multiplier is rejected', async () => {
    const { status } = await post('/woodlandwhisper/spin', { multiplier: -1 })
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('POST /spin with missing multiplier is rejected', async () => {
    const { status } = await post('/woodlandwhisper/spin', {})
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('POST /pick with negative userIndex is rejected', async () => {
    const { status } = await post('/woodlandwhisper/pick', { sessionId: 'x', userIndex: -1 })
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('POST /pick with missing userIndex is rejected', async () => {
    const { status } = await post('/woodlandwhisper/pick', { sessionId: 'x' })
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('POST /freespin with missing sessionId is rejected', async () => {
    const { status } = await post('/woodlandwhisper/freespin', {})
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('GET /state without sessionId query param is rejected', async () => {
    const { status } = await get('/woodlandwhisper/state')
    expect(status).toBeGreaterThanOrEqual(400)
  })
})
