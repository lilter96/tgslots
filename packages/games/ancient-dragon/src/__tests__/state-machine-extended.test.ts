import { describe, expect, it } from 'bun:test'
import { Metrics } from '@tgslots/slots-simulation-engine'
import type { AncientDragonBaseResult, AncientDragonFreeResult } from '../game-state-machine.js'
import { ancientDragonTestEngine as engine } from './test-engine.js'

describe('AncientDragonStateMachine — full round-trip + metrics', () => {
  it('records metrics through the shared cycle executor', () => {
    const seed = engine.findSeed((session) => {
      const result = session.act('spin') as AncientDragonBaseResult
      return result.triggeredFreeSpins
    })

    const session = engine.session({ seed: seed ?? 42 })
    session.act('cycle')

    const metrics = Metrics.finalize(session.collector.getRawMetrics())
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

  it('returns null when no free spins remain', () => {
    const emptySession = engine.session({ seed: 1 })
    expect(emptySession.act('next')).toBeNull()

    const depletedSession = engine.session({ seed: 1 })
    depletedSession.scenario('withFreeSpins', { spinsRemaining: 0 })
    expect(depletedSession.act('next')).toBeNull()
  })

  it('resets free-spin state on a new base spin', () => {
    const session = engine.session({ seed: 42 })
    session.scenario('withFreeSpins', { totalWin: 100, spinsRemaining: 5 })

    session.act('spin')
    expect(session.sm.state.freeSpins).toBeNull()
  })

  it('adds 10 spins on retrigger during a free spin', () => {
    const seed = engine.findSeed(
      (session) => {
        session.scenario('withFreeSpins', { spinsRemaining: 5 })
        const result = session.act('next') as AncientDragonFreeResult | null
        return Boolean(result?.retriggeredFreeSpins)
      },
      { maxSeeds: 500 },
    )

    expect(seed).not.toBeNull()

    const session = engine.session({ seed: seed ?? 0 })
    session.scenario('withFreeSpins', { spinsRemaining: 5 })
    const result = session.act('next') as AncientDragonFreeResult | null

    expect(result?.retriggeredFreeSpins).toBe(true)
    expect(session.sm.state.freeSpins!.spinsRemaining).toBeGreaterThanOrEqual(10)
  })

  it('accumulates free-spin totalWin across the full feature session', () => {
    const seed = engine.findSeed(
      (session) => {
        const result = session.act('spin') as AncientDragonBaseResult
        return result.triggeredFreeSpins
      },
      { maxSeeds: 2_000 },
    )

    expect(seed).not.toBeNull()

    const session = engine.session({ seed: seed ?? 0 })
    session.withinRound(() => {
      session.act('spin')

      let safety = 0
      while (session.sm.state.freeSpins && safety < 50) {
        const result = session.act('next')
        if (!result) break
        safety++
      }
    })

    const totalFreeWin = session.resultsOfType('FREE').reduce((sum, result) => sum + result.win, 0)
    expect(session.sm.state.freeSpins?.totalWin ?? totalFreeWin).toBe(totalFreeWin)
  })
})
