import { describe, expect, it } from 'bun:test'
import type { WoodlandWhisperBaseResult } from '../game-state-machine.js'
import { woodlandWhisperTestEngine as engine } from './test-engine.js'

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
