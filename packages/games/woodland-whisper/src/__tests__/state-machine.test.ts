import { describe, expect, it } from 'bun:test'
import { mt19937 } from '@tgslots/math/rng/mt19937'
import { Wager } from '@tgslots/slots-core/betting'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  ScopedMetrics,
} from '@tgslots/slots-simulation-engine'
import { BET_CONFIG } from '../constants.js'
import { WoodlandWhisperStateMachine } from '../game-state-machine.js'
import type {
  WoodlandWhisperBaseResult,
  WoodlandWhisperFreeResult,
  WoodlandWhisperPickResult,
  WoodlandWhisperState,
} from '../game-state-machine.js'
import { generatePickBonus } from '../logic.js'

describe('WoodlandWhisper Logic', () => {
  it('generatePickBonus should create a valid 20-item board and pick sequence', () => {
    const rng = mt19937(42)
    const winValue = 10
    const { board, pickSequence } = generatePickBonus(winValue).sample(rng)

    expect(board.length).toBe(20)
    expect(pickSequence.length).toBeGreaterThanOrEqual(2)

    // Check board contains pairs
    const counts = new Map<number, number>()
    for (const val of board) {
      counts.set(val, (counts.get(val) ?? 0) + 1)
    }
    for (const count of counts.values()) {
      expect(count).toBe(2)
    }

    // Check pick sequence results in winValue match
    const seen = new Set<number>()
    let matchedValue = -1
    for (let i = 0; i < pickSequence.length; i++) {
      const idx = pickSequence[i]
      if (idx === undefined) throw new Error('pickSequence index undefined')
      const val = board[idx]
      if (val === undefined) throw new Error('board value undefined')
      if (seen.has(val)) {
        matchedValue = val
        expect(i).toBe(pickSequence.length - 1) // Must be the last one
        break
      }
      seen.add(val)
    }
    expect(matchedValue).toBe(winValue)
  })
})

describe('WoodlandWhisperStateMachine', () => {
  it('should transition from BASE to PICK to FREE', () => {
    const rng = mt19937(12345) // Seed chosen to likely trigger sc >= 3 or just manually trigger
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // Manually force a trigger by finding a seed or just testing the methods
    // Let's test granular methods directly

    // 1. Base Spin
    const baseResult = sm.baseGameSpin(rng, wager)
    expect(baseResult.type).toBe('BASE')
    expect(baseResult.grid).toBeDefined()
    expect(baseResult.grid?.length).toBe(3)
    expect(baseResult.grid?.[0]?.length).toBe(5)

    if (baseResult.triggeredPickBonus) {
      expect(sm.state.pickBonus).not.toBeNull()

      // 2. Picking
      let lastPickResult: WoodlandWhisperPickResult | undefined
      while (sm.state.pickBonus) {
        // User taps card 0 each time; the actual reveal is predetermined by pickSequence
        const pickResult = sm.pickBall(0)
        expect(pickResult.type).toBe('PICK')
        expect(pickResult.pick).toBeDefined()
        lastPickResult = pickResult
      }
      expect(lastPickResult?.pick.isMatch).toBe(true)
      expect(sm.state.freeSpins).not.toBeNull()
      expect(sm.state.freeSpins?.spinsRemaining).toBeGreaterThan(0)

      // 3. Free Spins
      const initialSpins = sm.state.freeSpins?.spinsRemaining ?? 0
      const fsResult = sm.freeGameSpin(rng)
      expect(fsResult.type).toBe('FREE')
      expect(sm.state.freeSpins?.spinsRemaining).toBe(initialSpins - 1)
    }
  })

  it('should be recoverable from state', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // Setup a partial state
    const board = [10, 8, 10, 8, 15, 15, 20, 20, 30, 30, 50, 50, 75, 75, 100, 100, 13, 13, 9, 9]
    // Sequence that results in match (e.g. index 0 (10) and 2 (10))
    // We already picked index 0 (10)

    // pickSequence[0]=0 already played (value 10); [1]=1 → 8; [2]=2 → 10 (match)
    const state: WoodlandWhisperState = {
      lastGrid: null,
      freeSpins: {
        triggeringWager: wager,
        totalWin: 100,
        spinsRemaining: 5,
      },
      pickBonus: {
        board,
        pickSequence: [0, 1, 2],
        currentPickIndex: 1,
        userPicks: [0],
        revealedValues: [10],
        winValue: 10,
        triggeringWager: wager,
      },
    }

    // @ts-expect-error: accessing private property for state injection in test
    sm._state = state

    // User taps card 5 (cosmetic), but the reveal is predetermined: pickSequence[1]=1, board[1]=8
    const pickResult = sm.pickBall(5)
    expect(pickResult.pick?.revealedIndex).toBe(1)
    expect(pickResult.pick?.value).toBe(8)
    expect(pickResult.pick?.isMatch).toBe(false)
    expect(pickResult.pick?.userIndex).toBe(5)
    expect(sm.state.pickBonus?.userPicks).toEqual([0, 5])

    // User taps card 7 (cosmetic), predetermined: pickSequence[2]=2, board[2]=10 → match
    const matchResult = sm.pickBall(7)
    expect(matchResult.pick?.revealedIndex).toBe(2)
    expect(matchResult.pick?.value).toBe(10)
    expect(matchResult.pick?.isMatch).toBe(true)
    expect(sm.state.pickBonus).toBeNull()
    expect(sm.state.freeSpins?.spinsRemaining).toBe(15) // 5 + 10
  })

  it('pick value is predetermined by pickSequence regardless of user tap', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const board = [10, 8, 10, 8, 15, 15, 20, 20, 30, 30, 50, 50, 75, 75, 100, 100, 13, 13, 9, 9]

    // pickSequence: reveal positions [4,7,0] → values [15, 20, 10]
    // winValue is 10, but match requires two 10s — here only one is in the sequence so
    // we extend: [4,7,0,2] → values [15, 20, 10, 10] (match on last)
    const pickSequence = [4, 7, 0, 2]
    // @ts-expect-error: accessing private property for state injection in test
    sm._state = {
      lastGrid: null,
      freeSpins: null,
      pickBonus: {
        board,
        pickSequence,
        currentPickIndex: 0,
        userPicks: [],
        revealedValues: [],
        winValue: 10,
        triggeringWager: wager,
      },
    }

    // No matter which card the user taps, reveals follow pickSequence
    const r0 = sm.pickBall(19) // user taps card 19, but pickSequence[0]=4 → board[4]=15
    expect(r0.pick.revealedIndex).toBe(4)
    expect(r0.pick.value).toBe(15)
    expect(r0.pick.userIndex).toBe(19)
    expect(r0.pick.isMatch).toBe(false)

    const r1 = sm.pickBall(0) // user taps card 0, but pickSequence[1]=7 → board[7]=20
    expect(r1.pick.revealedIndex).toBe(7)
    expect(r1.pick.value).toBe(20)
    expect(r1.pick.isMatch).toBe(false)

    const r2 = sm.pickBall(0) // pickSequence[2]=0 → board[0]=10
    expect(r2.pick.revealedIndex).toBe(0)
    expect(r2.pick.value).toBe(10)
    expect(r2.pick.isMatch).toBe(false)

    const r3 = sm.pickBall(0) // pickSequence[3]=2 → board[2]=10 → second 10 = match
    expect(r3.pick.revealedIndex).toBe(2)
    expect(r3.pick.value).toBe(10)
    expect(r3.pick.isMatch).toBe(true)
    expect(sm.state.pickBonus).toBeNull()
    expect(sm.state.freeSpins?.spinsRemaining).toBe(10)
  })

  it('should record scatter-win in recordResultMetrics', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    interface MockMetricRecord {
      payouts: Record<string, number>
    }
    const mockMetrics: Record<string, MockMetricRecord> = {}

    function buildMockScope(key: string): ScopedMetrics {
      return {
        scope(subPath) {
          const sub = Array.isArray(subPath) ? (subPath as string[]).join('.') : (subPath as string)
          return buildMockScope(sub)
        },
        payout(id, win) {
          if (!mockMetrics[key]) mockMetrics[key] = { payouts: {} }
          mockMetrics[key]!.payouts[id] = (mockMetrics[key]!.payouts[id] ?? 0) + win
        },
        rtp(id, win) {
          if (!mockMetrics[key]) mockMetrics[key] = { payouts: {} }
          mockMetrics[key]!.payouts[id] = (mockMetrics[key]!.payouts[id] ?? 0) + win
        },
        distribution() {},
        count() {},
        value() {},
      }
    }

    const mockCollector: DataCollector = {
      scope(path) {
        const key = Array.isArray(path) ? (path as string[]).join('.') : (path as string)
        return buildMockScope(key)
      },
      count() {},
      value() {},
      distribution() {},
      payout() {},
      rtp() {},
      beginRound() {},
      collect() {},
      endRound() {},
      getRawMetrics() {
        throw new Error('not used in test')
      },
      getLastRoundSnapshot() {
        return null
      },
    }

    // Test BASE result with 3 scatters
    const baseResult: WoodlandWhisperBaseResult = {
      type: 'BASE',
      sc: 3,
      scatterWin: 150,
      win: 150,
      triggeredPickBonus: true,
      pickedBonus: 10,
      grid: [],
      hits: [],
      state: { freeSpinsLeft: 0, totalFreeSpinWin: 0 },
    }

    sm.recordResultMetrics(mockCollector, baseResult, { phase: 'spin', wager })

    // scatter-win for BASE is now tracked via recordRoundMetrics (from winsByType), not recordResultMetrics
    expect(mockMetrics['base-game']?.payouts['scatter-win']).toBeUndefined()

    // Test FREE result with 2 scatters
    const freeResult: WoodlandWhisperFreeResult = {
      type: 'FREE',
      sc: 2,
      scatterWin: 60, // 2 scatters is 1x total bet = 30. * 2 multiplier in free spins = 60.
      win: 60,
      pickedBonus: 0,
      retriggeredPickBonus: false,
      grid: [],
      hits: [],
      state: { freeSpinsLeft: 0, totalFreeSpinWin: 0 },
    }

    sm.recordResultMetrics(mockCollector, freeResult, { phase: 'next', wager })
    expect(mockMetrics['features.free-spins']?.payouts['scatter-win']).toBe(60)

    // Test recordRoundMetrics — scatter-win for BASE and FREE is sourced from winsByType
    const roundSnapshot: RoundMetricsSnapshot = {
      bet: 30,
      totalWin: 210,
      resultCount: 2,
      maxResultWin: 150,
      winsByType: { BASE: { total: 150, scatter: 150 }, FREE: { total: 60, scatter: 60 } },
      countsByType: { FREE: 1 },
    }
    sm.recordRoundMetrics(mockCollector, roundSnapshot, wager)
    expect(mockMetrics['base-game']?.payouts['scatter-win']).toBe(150)
    expect(mockMetrics['features.free-spins']?.payouts['scatter-rtp']).toBe(60)
  })
})
