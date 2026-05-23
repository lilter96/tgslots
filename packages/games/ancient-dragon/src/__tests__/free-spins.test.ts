import { describe, expect, it } from 'bun:test'
import type { AncientDragonBaseResult, AncientDragonFreeResult } from '../game-state-machine.js'
import { ancientDragonTestEngine as engine } from './test-engine.js'

describe('free-spins / next()', () => {
  it('is recoverable from seeded free-spin state via scenario registration', () => {
    const session = engine.session()
    session.scenario('withFreeSpins', { totalWin: 500, spinsRemaining: 5 })

    const freeResult = session.act('next') as AncientDragonFreeResult | null
    expect(freeResult?.type).toBe('FREE')
    expect(session.sm.state.freeSpins?.spinsRemaining).toBe(4)
  })

  it('returns null when no free spins remain', () => {
    const emptySession = engine.session({ seed: 1 })
    expect(emptySession.act('next')).toBeNull()

    const depletedSession = engine.session({ seed: 1 })
    depletedSession.scenario('withFreeSpins', { spinsRemaining: 0 })
    expect(depletedSession.act('next')).toBeNull()
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

  it('accumulates totalWin across the full feature session', () => {
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
