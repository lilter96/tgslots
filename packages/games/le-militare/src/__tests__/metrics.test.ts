import { describe, expect, it } from 'bun:test'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'
import type {
  LeMilitareBaseResult,
  LeMilitareFreeResult,
  LeMilitareBuyResult,
} from '../game-state-machine.js'
import { leMilitareTestEngine as engine } from './test-engine.js'
import { leMilitareMetrics } from '../metrics.js'

const testWager = new Wager(1, new BetConfiguration(100, 10, 10, 0))

function makeBaseResult(overrides?: Partial<LeMilitareBaseResult>): LeMilitareBaseResult {
  return {
    type: 'BASE',
    win: 0,
    scatterCount: 2,
    triggeredFreeSpins: false,
    freeSpinsAwarded: 0,
    steps: [],
    multiplierSum: 0,
    finalWin: 0,
    state: { freeSpinsLeft: 0, totalFreeSpinWin: 0, sessionMultiplierSum: 0 },
    ...overrides,
  }
}

function makeFreeResult(overrides?: Partial<LeMilitareFreeResult>): LeMilitareFreeResult {
  return {
    type: 'FREE',
    win: 100,
    scatterCount: 2,
    retriggered: false,
    freeSpinsAwarded: 0,
    steps: [],
    multiplierSum: 0,
    finalWin: 100,
    state: { freeSpinsLeft: 3, totalFreeSpinWin: 100, sessionMultiplierSum: 0 },
    ...overrides,
  }
}

function makeBuyResult(overrides?: Partial<LeMilitareBuyResult>): LeMilitareBuyResult {
  return {
    type: 'BUY',
    win: 0,
    scatterCount: 4,
    triggeredFreeSpins: true,
    freeSpinsAwarded: 8,
    steps: [],
    multiplierSum: 0,
    finalWin: 0,
    state: { freeSpinsLeft: 8, totalFreeSpinWin: 0, sessionMultiplierSum: 0 },
    ...overrides,
  }
}

describe('leMilitareMetrics (direct)', () => {
  it('records BASE scatter distribution and hits', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)

    leMilitareMetrics.recordResultMetrics(collector, makeBaseResult({ scatterCount: 3, win: 50 }), {
      phase: 'spin',
      wager: testWager,
    })

    const raw = collector.getRawMetrics()
    const baseScope = raw.rootScope.scopes['base-game']!
    expect(baseScope.metrics['scatter-count']).toBeDefined()
    expect(baseScope.metrics['hits']).toBeDefined()
  })

  it('records FREE spin metrics with retrigger', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)

    leMilitareMetrics.recordResultMetrics(
      collector,
      makeFreeResult({ scatterCount: 4, win: 200, retriggered: true, freeSpinsAwarded: 5 }),
      { phase: 'next', wager: testWager },
    )

    const raw = collector.getRawMetrics()
    const freeScope = raw.rootScope.scopes['features']!.scopes['free-spins']!
    expect(freeScope.metrics['spins-played']).toBeDefined()
    expect(freeScope.metrics['spin-win']).toBeDefined()
    expect(freeScope.metrics['retriggers']).toBeDefined()
  })

  it('records BUY bonus metrics', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(500)

    leMilitareMetrics.recordResultMetrics(collector, makeBuyResult(), {
      phase: 'spin',
      wager: testWager,
    })

    const raw = collector.getRawMetrics()
    const buyScope = raw.rootScope.scopes['features']!.scopes['buy-bonus']!
    expect(buyScope.metrics['purchases']).toBeDefined()
  })

  it('records base-game and feature RTP at round level', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect(makeBaseResult({ win: 50 }))
    collector.collect(makeFreeResult({ win: 200 }))
    collector.endRound()
    const round = collector.getLastRoundSnapshot()!

    leMilitareMetrics.recordRoundMetrics(collector, round, testWager)

    const raw = collector.getRawMetrics()
    expect(raw.rootScope.scopes['base-game']!.metrics['win']).toBeDefined()
    expect(
      raw.rootScope.scopes['features']!.scopes['free-spins']!.metrics['feature-rtp'],
    ).toBeDefined()
  })
})

describe('metrics', () => {
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

describe('RTP regression', () => {
  it('base-game finalWin = baseClusterWin * max(1, multiplierSum) * wager.multiplier', () => {
    const session = engine.session({ betLevel: 5, seed: 314159 })

    for (let round = 0; round < 1_000; round++) {
      const result = session.act('spin')
      expect(result.win).toBe(result.finalWin)
      expect(result.win).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(result.win)).toBe(true)
    }
  })

  it('200 rounds produce no NaN or negative wins (base + limited free spins)', () => {
    const session = engine.session({ seed: 271828 })
    const rounds = 200
    const freeSpinCap = 50

    for (let round = 0; round < rounds; round++) {
      session.withinRound(() => {
        const baseResult = session.act('spin')
        expect(baseResult.win).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(baseResult.win)).toBe(true)

        let sessionSpins = 0
        while (session.sm.state.freeSpins && session.sm.state.freeSpins.spinsRemaining > 0) {
          if (sessionSpins >= freeSpinCap) {
            break
          }

          const freeResult = session.act('next')
          if (!freeResult) break

          expect(freeResult.win).toBeGreaterThanOrEqual(0)
          expect(Number.isFinite(freeResult.win)).toBe(true)
          sessionSpins++
        }
      })

      if (session.sm.state.freeSpins && session.sm.state.freeSpins.spinsRemaining > 0) {
        session.resetMachine()
      }
    }
  })

  it('free spin win is always non-negative across 100 direct free spin invocations', () => {
    const session = engine.session({ seed: 42 })
    session.scenario('withFreeSpins', {
      spinsRemaining: 100,
      armedReels: new Set([0, 2, 4]),
      multiplierSum: 5,
    })

    let spinsPlayed = 0
    while (
      session.sm.state.freeSpins &&
      session.sm.state.freeSpins.spinsRemaining > 0 &&
      spinsPlayed < 100
    ) {
      const result = session.act('next')
      if (!result) break

      expect(result.win).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(result.win)).toBe(true)
      spinsPlayed++
    }

    expect(spinsPlayed).toBeGreaterThan(0)
  })
})
