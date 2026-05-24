import { describe, expect, it } from 'bun:test'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'
import type {
  WoodlandWhisperBaseResult,
  WoodlandWhisperFreeResult,
  WoodlandWhisperBuyResult,
} from '../game-state-machine.js'
import { woodlandWhisperTestEngine as engine } from './test-engine.js'
import { woodlandWhisperMetrics } from '../metrics.js'

const testWager = new Wager(1, new BetConfiguration(100, 10, 10, 0))

function makeBaseResult(overrides?: Partial<WoodlandWhisperBaseResult>): WoodlandWhisperBaseResult {
  return {
    type: 'BASE',
    win: 0,
    sc: 2,
    scatterWin: 0,
    grid: [],
    hits: [],
    pickedBonus: 0,
    triggeredPickBonus: false,
    state: { freeSpinsLeft: 0, totalFreeSpinWin: 0 },
    ...overrides,
  }
}

function makeFreeResult(overrides?: Partial<WoodlandWhisperFreeResult>): WoodlandWhisperFreeResult {
  return {
    type: 'FREE',
    win: 100,
    sc: 1,
    scatterWin: 10,
    grid: [],
    hits: [],
    pickedBonus: 0,
    retriggeredPickBonus: false,
    state: { freeSpinsLeft: 3, totalFreeSpinWin: 100 },
    ...overrides,
  }
}

describe('woodlandWhisperMetrics (direct)', () => {
  it('records BASE scatter distribution and pick-bonus triggers', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)

    woodlandWhisperMetrics.recordResultMetrics(
      collector,
      makeBaseResult({ sc: 3, triggeredPickBonus: true, pickedBonus: 8 }),
      { phase: 'spin', wager: testWager },
    )

    const raw = collector.getRawMetrics()
    expect(raw.rootScope.scopes['base-game']!.metrics['scatter-count']).toBeDefined()
    expect(
      raw.rootScope.scopes['features']!.scopes['free-spins']!.metrics['triggers'],
    ).toBeDefined()
  })

  it('records FREE spin metrics with scatter-win', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)

    woodlandWhisperMetrics.recordResultMetrics(
      collector,
      makeFreeResult({ sc: 4, win: 200, scatterWin: 20 }),
      { phase: 'next', wager: testWager },
    )

    const raw = collector.getRawMetrics()
    const freeScope = raw.rootScope.scopes['features']!.scopes['free-spins']!
    expect(freeScope.metrics['spins-played']).toBeDefined()
    expect(freeScope.metrics['spin-win']).toBeDefined()
    expect(freeScope.metrics['scatter-win']).toBeDefined()
  })

  it('records BUY bonus metrics', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(500)

    const buyResult: WoodlandWhisperBuyResult = {
      type: 'BUY',
      win: 0,
      sc: 4,
      scatterWin: 0,
      grid: [],
      hits: [],
      pickedBonus: 8,
      triggeredPickBonus: true,
      state: { freeSpinsLeft: 0, totalFreeSpinWin: 0 },
    }
    woodlandWhisperMetrics.recordResultMetrics(collector, buyResult, {
      phase: 'spin',
      wager: testWager,
    })

    const raw = collector.getRawMetrics()
    expect(
      raw.rootScope.scopes['features']!.scopes['buy-bonus']!.metrics['purchases'],
    ).toBeDefined()
  })

  it('records round-level RTP including scatter-rtp', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect(makeBaseResult({ win: 30, scatterWin: 5 }))
    collector.collect(makeFreeResult({ win: 200, scatterWin: 40 }))
    collector.endRound()
    const round = collector.getLastRoundSnapshot()!

    woodlandWhisperMetrics.recordRoundMetrics(collector, round, testWager)

    const raw = collector.getRawMetrics()
    expect(raw.rootScope.scopes['base-game']!.metrics['scatter-win']).toBeDefined()
    expect(
      raw.rootScope.scopes['features']!.scopes['free-spins']!.metrics['scatter-rtp'],
    ).toBeDefined()
  })
})

describe('metrics', () => {
  it('records scatter-win metrics through the shared harness', () => {
    const baseSession = engine.session({ seed: 42 })
    baseSession.act('spin')
    baseSession.assertMetricDefined('base-game', 'scatter-win')

    const freeSession = engine.session({ seed: 77 })
    freeSession.scenario('withFreeSpins', { spinsRemaining: 3 })
    freeSession.act('next')
    freeSession.assertMetricDefined('features/free-spins', 'scatter-win')
  })

  it('records BASE result metrics', () => {
    const session = engine.session({ seed: 42 })
    session.act('spin')

    session.assertScopeDefined('base-game')
  })

  it('records BUY result metrics', () => {
    const session = engine.session({ seed: 42 })
    session.act('buyBonus')

    session.assertScopeDefined('features/buy-bonus')
    session.assertMetricDefined('features/buy-bonus', 'purchases')
  })

  it('records FREE result metrics with scatters', () => {
    const session = engine.session({ seed: 77 })
    session.scenario('withFreeSpins', { spinsRemaining: 3 })
    session.act('next')

    session.assertScopeDefined('features/free-spins')
    session.assertMetricDefined('features/free-spins', 'spins-played')
  })

  it('does not record FREE spin counters for a PICK-only step', () => {
    const session = engine.session({ seed: 42 })
    session.act('buyBonus')
    session.act('pickBall', 0)

    expect(session.getMetric('features/free-spins', 'spins-played')).toBeUndefined()
  })

  it('tracks base and free RTP plus session metrics across a full round', () => {
    const session = engine.session({ seed: 42 })

    session.withinRound(() => {
      const baseResult = session.act('spin') as WoodlandWhisperBaseResult

      if (!baseResult.triggeredPickBonus) {
        return
      }

      for (let pick = 0; pick < 20 && session.sm.state.pickBonus; pick++) {
        session.act('pickBall', pick)
      }

      while (session.sm.state.freeSpins?.spinsRemaining) {
        const result = session.act('next')
        if (!result) break
      }
    })

    session.assertMetricDefined('base-game', 'win')
    session.assertMetricDefined('base-game', 'scatter-win')
    session.assertMetricDefined('features/free-spins', 'feature-rtp')
    session.assertMetricDefined('features/free-spins', 'scatter-rtp')
  })

  it('keeps base metrics when no feature round data is present', () => {
    const seed = engine.findSeed((session) => {
      const result = session.act('spin') as WoodlandWhisperBaseResult
      return !result.triggeredPickBonus
    })

    expect(seed).not.toBeNull()

    const session = engine.session({ seed: seed ?? 0 })
    session.act('spin')

    const round = session.lastRound?.snapshot
    if (round) {
      expect(round.countsByType.FREE ?? 0).toBe(0)
      expect(round.countsByType.PICK ?? 0).toBe(0)
    }

    session.assertMetricDefined('base-game', 'win')
  })
})
