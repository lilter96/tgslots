import { describe, expect, it } from 'bun:test'
import type { LeMilitareFreeResult, LeMilitareState } from '../game-state-machine.js'
import { LeMilitareStateMachine } from '../game-state-machine.js'
import { leMilitareTestEngine as engine } from './test-engine.js'

describe('free-spins / next()', () => {
  it('returns null when no free spins remain', () => {
    const session = engine.session({ seed: 1 })
    expect(session.act('next')).toBeNull()
  })

  it('decrements spinsRemaining during a free spin', () => {
    const session = engine.session({ seed: 42 })
    session.scenario('withFreeSpins', { spinsRemaining: 3 })

    const result = session.act('next') as LeMilitareFreeResult | null
    expect(result?.type).toBe('FREE')
    expect(result?.state.freeSpinsLeft).toBeLessThanOrEqual(2)
    expect(typeof result?.win).toBe('number')
    expect(typeof result?.scatterCount).toBe('number')
    expect(Array.isArray(result?.steps)).toBe(true)
  })

  it('accumulates totalWin across free spins', () => {
    const session = engine.session({ seed: 100 })
    session.scenario('withFreeSpins', { spinsRemaining: 5 })

    let totalWin = 0
    for (let spin = 0; spin < 10; spin++) {
      const result = session.act('next')
      if (!result) break
      totalWin += result.win
    }

    expect(session.sm.state.freeSpins?.totalWin).toBe(totalWin)
  })

  it('accumulates roundWin across free spins for max-win cap', () => {
    const session = engine.session({ seed: 42 })
    const baseResult = session.act('spin')

    // roundWin is set to the (capped) base spin win
    expect(session.sm.state.roundWin).toBe(baseResult.win)

    const individualWins: number[] = []
    for (let i = 0; i < 100; i++) {
      const result = session.act('next')
      if (!result) break
      individualWins.push(result.win)
    }

    // roundWin must be at least the sum of all individual wins (cap not hit)
    // If the cap were hit, roundWin would equal cap and spins would stop early
    const totalIndividualWins = individualWins.reduce((a, b) => a + b, 0)
    expect(session.sm.state.roundWin).toBeGreaterThanOrEqual(totalIndividualWins)
  })

  it('preserves roundWin when reconstructing state machine from serialized state', () => {
    // Simulate hydrate/dehydrate cycle: extract state fields, create a new
    // machine, verify roundWin is not reset to 0 (the API module bug was that
    // hydrate() always set roundWin=0 and dehydrate() never wrote it).
    const session = engine.session()
    session.scenario('withFreeSpins', { spinsRemaining: 3, totalWin: 100 })

    // Play a free spin to accumulate roundWin
    const f1 = session.act('next') as LeMilitareFreeResult | null
    expect(f1).not.toBeNull()
    expect(session.sm.state.roundWin).toBe(f1!.win)

    // Simulate buggy reconstruction (what the API module currently does)
    const s = session.sm.state
    const buggyState: LeMilitareState = {
      lastGrid: s.lastGrid,
      freeSpins: s.freeSpins,
      lastSpinResult: null,
      roundWin: 0, // <-- the bug: roundWin always reset to 0
    }
    const buggyMachine = new LeMilitareStateMachine(buggyState)
    expect(buggyMachine.state.roundWin).toBe(0)

    // Correct reconstruction — what the fix should produce
    const correctState: LeMilitareState = {
      lastGrid: s.lastGrid,
      freeSpins: s.freeSpins,
      lastSpinResult: null,
      roundWin: s.roundWin, // <-- fix: preserve roundWin
    }
    const correctMachine = new LeMilitareStateMachine(correctState)
    expect(correctMachine.state.roundWin).toBe(f1!.win)

    // Verify the correct machine can continue playing free spins with cap
    const f2 = correctMachine.next(session.rng)
    expect(f2).not.toBeNull()
    // roundWin should accumulate: f1.win + f2.win
    expect(correctMachine.state.roundWin).toBeGreaterThanOrEqual(f1!.win)
  })
})
