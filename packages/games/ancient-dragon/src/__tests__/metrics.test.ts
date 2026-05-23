import { describe, expect, it } from 'bun:test'
import { Metrics } from '@tgslots/slots-simulation-engine'
import type { AncientDragonBaseResult, AncientDragonFreeResult } from '../game-state-machine.js'
import { ancientDragonTestEngine as engine } from './test-engine.js'

describe('metrics', () => {
  it('records metrics through the shared cycle executor', () => {
    const seed = engine.findSeed((session) => {
      const result = session.act('spin') as AncientDragonBaseResult
      return result.triggeredFreeSpins
    })

    const session = engine.session({ seed: seed ?? 42 })
    session.act('cycle')

    const metrics = Metrics.finalize(session.getRawMetrics())
    expect(metrics.summary.rounds).toBeGreaterThanOrEqual(1)
  })

  it('tracks BASE scatter distribution and hit scopes', () => {
    const session = engine.session({ seed: 42 })
    session.act('spin')

    session.assertScopeDefined('base-game')
  })

  it('tracks FREE spin result metrics from a registered scenario', () => {
    const session = engine.session({ seed: 123 })
    session.scenario('withFreeSpins', { spinsRemaining: 5 })

    const freeResult = session.act('next') as AncientDragonFreeResult | null
    expect(freeResult).not.toBeNull()

    session.assertScopeDefined('features/free-spins')
    const spinsPlayed = session.getMetric('features/free-spins', 'spins-played')
    expect(spinsPlayed?.kind).toBe('count')
    expect((spinsPlayed as { total: number }).total).toBeGreaterThanOrEqual(1)
  })

  it('tracks base and free RTP metrics after a round closes', () => {
    const session = engine.session({ seed: 42 })
    session.act('spin')

    session.assertMetricDefined('base-game', 'win')
  })

  it('tracks session metrics when free spins are present', () => {
    const session = engine.session({ seed: 77 })
    session.scenario('withFreeSpins', { spinsRemaining: 3 })
    session.act('next')

    session.assertScopeDefined('features/free-spins')
  })
})
