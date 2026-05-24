import { describe, expect, it } from 'bun:test'
import type { LeMilitareBaseResult } from '../game-state-machine.js'
import { leMilitareTestEngine as engine } from './test-engine.js'

describe('spin()', () => {
  it('produces BASE result with expected shape', () => {
    const session = engine.session({ seed: 42 })
    const result = session.act('spin') as LeMilitareBaseResult

    expect(result.type).toBe('BASE')
    expect(typeof result.win).toBe('number')
    expect(typeof result.scatterCount).toBe('number')
    expect(typeof result.triggeredFreeSpins).toBe('boolean')
    expect(typeof result.freeSpinsAwarded).toBe('number')
    expect(Array.isArray(result.steps)).toBe(true)
    expect(result.state).toHaveProperty('freeSpinsLeft')
    expect(result.state).toHaveProperty('totalFreeSpinWin')
    expect(result.components).toBeDefined()
  })

  it('resets freeSpins and lastSpinResult', () => {
    const session = engine.session({
      initialState: {
        lastGrid: null,
        freeSpins: {
          triggeringWager: engine.wager(),
          spinsRemaining: 3,
          totalWin: 500,
          armedReels: new Set([1]),
          multiplierSum: 2,
        },
        lastSpinResult: null,
        roundWin: 0,
      },
      seed: 42,
    })

    session.act('spin')
    expect(session.sm.state.freeSpins).toBeNull()
  })
})
