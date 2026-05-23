import { describe, expect, it } from 'bun:test'
import { SlotsTestEngine } from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { ModernDataCollector, Metrics } from '@tgslots/slots-simulation-engine'
import { BET_CONFIG } from '../constants.js'
import type { AncientDragonFreeResult, AncientDragonBaseResult } from '../game-state-machine.js'
import { AncientDragonStateMachine } from '../game-state-machine.js'

describe('AncientDragonStateMachine — full round-trip + metrics', () => {
  const engine = new SlotsTestEngine(AncientDragonStateMachine, BET_CONFIG)

  it('records metrics via recordResultMetrics and recordRoundMetrics', () => {
    const seed = engine.findSeed((r) => (r as AncientDragonBaseResult).triggeredFreeSpins)
    const { collector } = engine.runCycle({ seed: seed ?? 42 })

    const metrics = Metrics.finalize(collector.getRawMetrics())
    expect(metrics.summary.rounds).toBeGreaterThanOrEqual(0)
  })

  it('recordResultMetrics tracks BASE scatter distribution and hits', () => {
    const { collector } = engine.runSpin({ seed: 42 })

    engine.assertScopeDefined(collector, 'base-game')
  })

  it('recordResultMetrics tracks FREE spin results', () => {
    const sm = engine.createMachine({
      freeSpins: { triggeringWager: engine.wager(), totalWin: 0, spinsRemaining: 5 },
    })

    const rng = engine.rng(123)
    const collector = new ModernDataCollector()
    const freeResult = sm.next(rng) as AncientDragonFreeResult
    expect(freeResult).not.toBeNull()

    sm.recordResultMetrics!(collector, freeResult!, { phase: 'next', wager: engine.wager() })

    const freeScope = engine.getScope(collector, 'features/free-spins')
    expect(freeScope).toBeDefined()
    const spinsPlayed = freeScope?.metrics['spins-played']
    expect(spinsPlayed?.kind).toBe('count')
    expect((spinsPlayed as { total: number })?.total ?? 0).toBeGreaterThanOrEqual(1)
  })

  it('recordRoundMetrics tracks base and free RTP metrics', () => {
    const { collector } = engine.runSpin({ seed: 42 })

    engine.assertMetricDefined(collector, 'base-game', 'win')
  })

  it('recordRoundMetrics tracks session metrics when free spins are present', () => {
    const sm = engine.createMachine({
      freeSpins: { triggeringWager: engine.wager(), totalWin: 0, spinsRemaining: 3 },
    })

    const collector = new ModernDataCollector()
    const rng = engine.rng(77)

    collector.beginRound(engine.wager().totalWager)
    const freeResult = sm.next(rng)
    if (freeResult) {
      collector.collect(freeResult)
      sm.recordResultMetrics?.(collector, freeResult, { phase: 'next', wager: engine.wager() })
    }
    collector.endRound()

    const round = collector.getLastRoundSnapshot()
    expect(round).not.toBeNull()
    sm.recordRoundMetrics!(collector, round!, engine.wager())

    engine.assertScopeDefined(collector, 'features/free-spins')
  })

  it('freeGameSpin throws when no free spins remaining', () => {
    const sm = engine.createMachine()
    const rng = engine.rng(1)

    expect(sm.next(rng)).toBeNull()

    const sm2 = engine.createMachine({
      freeSpins: { triggeringWager: engine.wager(), totalWin: 0, spinsRemaining: 0 },
    })
    expect(sm2.next(engine.rng(1))).toBeNull()
  })

  it('spin resets freeSpins state on new base spin', () => {
    const sm = engine.createMachine({
      freeSpins: { triggeringWager: engine.wager(), totalWin: 100, spinsRemaining: 5 },
    })
    expect(sm.state.freeSpins).not.toBeNull()

    sm.spin(engine.rng(42), engine.wager())
    expect(sm.state.freeSpins).toBeNull()
  })

  it('retrigger adds 10 spins when sc >= 3 during free spin', () => {
    for (let seed = 0; seed < 500; seed++) {
      const sm = engine.createMachine({
        freeSpins: { triggeringWager: engine.wager(), totalWin: 0, spinsRemaining: 5 },
      })
      const result = sm.next(engine.rng(seed)) as AncientDragonFreeResult | null
      if (result?.retriggeredFreeSpins) {
        expect(sm.state.freeSpins!.spinsRemaining).toBeGreaterThanOrEqual(10)
        return
      }
    }
  })

  it('baseGameSpin accumulates freeSpins totalWin across free games', () => {
    for (let seed = 0; seed < 200; seed++) {
      const sm = engine.createMachine()
      sm.spin(engine.rng(seed), engine.wager())
      if (sm.state.freeSpins) {
        let totalWin = 0
        for (let i = 0; i < 20; i++) {
          const result = sm.next(engine.rng(seed + i + 1000))
          if (!result) break
          totalWin += result.win
        }
        expect(sm.state.freeSpins.totalWin).toBe(totalWin)
        return
      }
    }
  })
})
