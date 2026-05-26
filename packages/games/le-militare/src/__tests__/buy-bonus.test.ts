import { describe, expect, it } from 'bun:test'
import type { LeMilitareBuyResult } from '../game-state-machine.js'
import { freeSpinsAwarded } from '../helpers.js'
import { BUY_OPTIONS } from '../constants.js'
import { leMilitareTestEngine as engine } from './test-engine.js'

describe('buy-bonus / buyBonus()', () => {
  it('produces BUY result', () => {
    const session = engine.session({ seed: 999 })
    const result = session.act('buyBonus') as LeMilitareBuyResult

    expect(result.type).toBe('BUY')
    expect(result.triggeredFreeSpins).toBe(true)
    expect(result.freeSpinsAwarded).toBeGreaterThan(0)
    expect(Array.isArray(result.steps)).toBe(true)
    expect(result.state.freeSpinsLeft).toBeGreaterThan(0)
  })

  it('sets up freeSpins state', () => {
    const session = engine.session({ seed: 888 })
    session.act('buyBonus')

    expect(session.sm.state.freeSpins).not.toBeNull()
    expect(session.sm.state.freeSpins!.spinsRemaining).toBeGreaterThan(0)
  })

  it('resets previous state', () => {
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
        roundWin: 0,
      },
      seed: 777,
    })

    session.act('buyBonus')
    expect(session.sm.state.freeSpins!.spinsRemaining).not.toBe(3)
  })

  it('awards spins from tier config, not cascade-inflated scatter count', () => {
    // The buy bonus must use the tier's configured scatter count for the
    // spin award — cascade-accumulated scatters on the forced entry must
    // not inflate the award beyond what was paid for.
    const session = engine.session({ seed: 999 })
    const result = session.act('buyBonus') as LeMilitareBuyResult

    // The awarded spins should match the lookup for the standard tier's
    // minScatters (not the sampler's potentially inflated count).
    const expected = freeSpinsAwarded(BUY_OPTIONS.standard.minScatters)
    expect(result.freeSpinsAwarded).toBe(expected)
    expect(session.sm.state.freeSpins!.spinsRemaining).toBe(expected)
  })
})
