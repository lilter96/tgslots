import { describe, expect, it } from 'bun:test'
import type {
  LeMilitareBaseResult,
  LeMilitareBuyResult,
  LeMilitareFreeResult,
} from '../game-state-machine.js'
import { leMilitareTestEngine as engine } from './test-engine.js'

describe('LeMilitareStateMachine — full round-trip', () => {
  it('spin produces BASE result with expected shape', () => {
    const session = engine.session({ seed: 42 })
    const result = session.act('spin') as LeMilitareBaseResult

    expect(result.type).toBe('BASE')
    expect(typeof result.win).toBe('number')
    expect(typeof result.scatterCount).toBe('number')
    expect(typeof result.triggeredFreeSpins).toBe('boolean')
    expect(typeof result.freeSpinsAwarded).toBe('number')
    expect(Array.isArray(result.steps)).toBe(true)
    expect(result.state).toHaveProperty('freeSpinsLeft')
    expect(result.state).toHaveProperty('totalFreeSpinWin')
    expect(result.components).toBeDefined()
  })

  it('spin resets freeSpins and lastSpinResult', () => {
    const session = engine.session({
      initialState: {
        lastGrid: null,
        freeSpins: {
          triggeringWager: engine.wager(),
          spinsRemaining: 3,
          totalWin: 500,
          armedReels: new Set([1]),
          multiplierSum: 2,
        },
        lastSpinResult: null,
      },
      seed: 42,
    })

    session.act('spin')
    expect(session.sm.state.freeSpins).toBeNull()
  })

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
})

describe('LeMilitareStateMachine — buy bonus', () => {
  it('buyBonus produces BUY result', () => {
    const session = engine.session({ seed: 999 })
    const result = session.act('buyBonus') as LeMilitareBuyResult

    expect(result.type).toBe('BUY')
    expect(result.triggeredFreeSpins).toBe(true)
    expect(result.freeSpinsAwarded).toBeGreaterThan(0)
    expect(Array.isArray(result.steps)).toBe(true)
    expect(result.state.freeSpinsLeft).toBeGreaterThan(0)
  })

  it('buyBonus sets up freeSpins state', () => {
    const session = engine.session({ seed: 888 })
    session.act('buyBonus')

    expect(session.sm.state.freeSpins).not.toBeNull()
    expect(session.sm.state.freeSpins!.spinsRemaining).toBeGreaterThan(0)
  })

  it('buyBonus resets previous state', () => {
    const session = engine.session({
      initialState: {
        lastGrid: null,
        freeSpins: {
          triggeringWager: engine.wager(),
          spinsRemaining: 3,
          totalWin: 100,
          armedReels: new Set<number>(),
          multiplierSum: 0,
        },
        lastSpinResult: null,
      },
      seed: 777,
    })

    session.act('buyBonus')
    expect(session.sm.state.freeSpins!.spinsRemaining).not.toBe(3)
  })
})

describe('LeMilitareStateMachine — metrics', () => {
  it('records BASE result metrics including triggered free spins', () => {
    const seed = engine.findSeed(
      (session) => {
        const result = session.act('spin') as LeMilitareBaseResult
        return result.triggeredFreeSpins
      },
      { maxSeeds: 2_000 },
    )

    expect(seed).not.toBeNull()

    const session = engine.session({ seed: seed ?? 0 })
    session.act('spin')

    session.assertScopeDefined('base-game')
    session.assertMetricDefined('features/free-spins', 'triggers')
    session.assertMetricDefined('features/free-spins', 'spins-awarded')
  })

  it('records BUY result metrics', () => {
    const session = engine.session({ seed: 555 })
    session.act('buyBonus')

    session.assertScopeDefined('features/buy-bonus')
    session.assertMetricDefined('features/buy-bonus', 'purchases')
  })

  it('records FREE result metrics including spin payout', () => {
    const session = engine.session({ seed: 42 })
    session.scenario('withFreeSpins', { spinsRemaining: 3 })
    session.act('next')

    session.assertScopeDefined('features/free-spins')
    session.assertMetricDefined('features/free-spins', 'spins-played')
  })

  it('tracks base win RTP and feature RTP', () => {
    const session = engine.session({ seed: 42 })

    session.withinRound(() => {
      const baseResult = session.act('spin') as LeMilitareBaseResult
      if (!baseResult.triggeredFreeSpins) {
        return
      }

      while (session.sm.state.freeSpins?.spinsRemaining) {
        const nextResult = session.act('next')
        if (!nextResult) break
      }
    })

    session.assertMetricDefined('base-game', 'win')
    session.assertMetricDefined('features/free-spins', 'feature-rtp')
  })

  it('tracks session metrics when free spins are played', () => {
    const session = engine.session({ seed: 77 })
    session.scenario('withFreeSpins', { spinsRemaining: 2 })
    session.act('next')

    session.assertMetricDefined('features/free-spins', 'session-win')
    session.assertMetricDefined('features/free-spins', 'triggered-round-win')
    session.assertMetricDefined('features/free-spins', 'total-spins-per-trigger')
  })
})
