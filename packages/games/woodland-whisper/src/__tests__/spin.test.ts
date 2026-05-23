import { describe, expect, it } from 'bun:test'
import type { WoodlandWhisperBaseResult } from '../game-state-machine.js'
import { woodlandWhisperTestEngine as engine } from './test-engine.js'

describe('spin()', () => {
  it('initInitialGrid sets a valid grid', () => {
    const session = engine.session({ seed: 42 })
    session.act('initInitialGrid')

    const grid = session.sm.state.lastGrid
    expect(grid).not.toBeNull()
    expect(grid!).toHaveLength(3)
    expect(grid![0]).toHaveLength(5)
  })

  it('initInitialGrid produces valid dimensions across multiple seeds', () => {
    for (let seed = 0; seed < 50; seed++) {
      const session = engine.session({ seed })
      session.act('initInitialGrid')

      const grid = session.sm.state.lastGrid!
      expect(grid).toHaveLength(3)
      expect(grid[0]).toHaveLength(5)
    }
  })

  it('produces BASE result with expected shape', () => {
    const session = engine.session({ seed: 42 })
    const result = session.act('spin') as WoodlandWhisperBaseResult

    expect(result.type).toBe('BASE')
    expect(typeof result.win).toBe('number')
    expect(typeof result.sc).toBe('number')
    expect(Array.isArray(result.grid)).toBe(true)
    expect(result.grid).toHaveLength(3)
    expect(Array.isArray(result.hits)).toBe(true)
    expect(result.state).toHaveProperty('freeSpinsLeft')
    expect(result.components).toBeDefined()
  })

  it('resets freeSpins and pickBonus', () => {
    const session = engine.session({
      initialState: {
        lastGrid: null,
        freeSpins: { triggeringWager: engine.wager(), totalWin: 100, spinsRemaining: 5 },
        pickBonus: {
          board: [],
          pickSequence: [],
          currentPickIndex: 0,
          userPicks: [],
          revealedValues: [],
          winValue: 0,
          triggeringWager: engine.wager(),
        },
      },
      seed: 42,
    })

    session.act('spin')
    expect(session.sm.state.freeSpins).toBeNull()
    expect(session.sm.state.pickBonus).toBeNull()
  })
})
