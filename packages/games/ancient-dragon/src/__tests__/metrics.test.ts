import { describe, expect, it } from 'bun:test'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'
import type { AncientDragonBaseResult, AncientDragonFreeResult } from '../game-state-machine.js'
import { ancientDragonMetrics } from '../metrics.js'

const testWager = new Wager(1, new BetConfiguration(100, 10, 10, 0))

function makeBaseResult(overrides?: Partial<AncientDragonBaseResult>): AncientDragonBaseResult {
  return {
    type: 'BASE',
    win: 0,
    sc: 2,
    triggeredFreeSpins: false,
    grid: [],
    hits: [],
    ...overrides,
  }
}

function makeFreeResult(overrides?: Partial<AncientDragonFreeResult>): AncientDragonFreeResult {
  return {
    type: 'FREE',
    win: 100,
    sc: 1,
    retriggeredFreeSpins: false,
    grid: [],
    hits: [],
    ...overrides,
  }
}

describe('ancientDragonMetrics', () => {
  describe('recordResultMetrics', () => {
    it('records BASE scatter distribution and hits', () => {
      const collector = new ModernDataCollector()
      collector.beginRound(100)

      ancientDragonMetrics.recordResultMetrics(collector, makeBaseResult({ sc: 2, win: 50 }), {
        phase: 'spin',
        wager: testWager,
      })

      const raw = collector.getRawMetrics()
      const baseScope = raw.rootScope.scopes['base-game']!
      expect(baseScope.metrics['scatter-count']).toBeDefined()
      expect(baseScope.metrics['scatter-count']!.kind).toBe('distribution')
      expect(baseScope.metrics['hits']).toBeDefined()
      expect(baseScope.metrics['hits']!.kind).toBe('count')
    })

    it('records FREE spin metrics with scopes', () => {
      const collector = new ModernDataCollector()
      collector.beginRound(100)

      ancientDragonMetrics.recordResultMetrics(
        collector,
        makeFreeResult({ sc: 2, win: 150, retriggeredFreeSpins: true }),
        { phase: 'next', wager: testWager },
      )

      const raw = collector.getRawMetrics()
      const freeScope = raw.rootScope.scopes['features']!.scopes['free-spins']!
      expect(freeScope.metrics['spins-played']).toBeDefined()
      expect(freeScope.metrics['spin-win']).toBeDefined()
      expect(freeScope.metrics['retriggers']).toBeDefined()
    })

    it('does not record triggers when not triggered', () => {
      const collector = new ModernDataCollector()
      collector.beginRound(100)

      ancientDragonMetrics.recordResultMetrics(
        collector,
        makeBaseResult({ sc: 2, win: 0, triggeredFreeSpins: false }),
        { phase: 'spin', wager: testWager },
      )

      const raw = collector.getRawMetrics()
      const freeScope = raw.rootScope.scopes['features']?.scopes['free-spins']
      // triggers should not be recorded (scope may not exist at all)
      const triggers = freeScope?.metrics['triggers']
      expect(triggers).toBeUndefined()
    })
  })

  describe('recordRoundMetrics', () => {
    it('records base-game and feature RTP', () => {
      const collector = new ModernDataCollector()
      collector.beginRound(100)
      collector.collect(makeBaseResult({ win: 0 }))
      collector.collect(makeFreeResult({ win: 200 }))
      collector.endRound()
      const round = collector.getLastRoundSnapshot()!

      ancientDragonMetrics.recordRoundMetrics(collector, round, testWager)

      const raw = collector.getRawMetrics()
      const baseScope = raw.rootScope.scopes['base-game']!
      expect(baseScope.metrics['win']).toBeDefined()
      expect(baseScope.metrics['win']!.kind).toBe('rtp')
    })

    it('records session-win when free spins occurred', () => {
      const collector = new ModernDataCollector()
      collector.beginRound(100)
      collector.collect(makeBaseResult({ win: 0 }))
      collector.collect(makeFreeResult({ win: 200 }))
      collector.endRound()
      const round = collector.getLastRoundSnapshot()!

      ancientDragonMetrics.recordRoundMetrics(collector, round, testWager)

      const raw = collector.getRawMetrics()
      const freeScope = raw.rootScope.scopes['features']!.scopes['free-spins']!
      expect(freeScope.metrics['session-win']).toBeDefined()
    })
  })
})
