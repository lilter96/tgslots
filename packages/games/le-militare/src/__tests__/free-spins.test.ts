import { describe, expect, it } from 'bun:test'
import type { LeMilitareFreeResult } from '../game-state-machine.js'
import { leMilitareTestEngine as engine } from './test-engine.js'

describe('free-spins / next()', () => {
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
