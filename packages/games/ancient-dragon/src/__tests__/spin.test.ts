import { describe, expect, it } from 'bun:test'
import type { AncientDragonBaseResult, AncientDragonFreeResult } from '../game-state-machine.js'
import { ancientDragonTestEngine as engine } from './test-engine.js'

describe('spin()', () => {
  it('transitions from BASE to FREE', () => {
    const seed = engine.findSeed((session) => {
      const result = session.act('spin') as AncientDragonBaseResult
      return result.triggeredFreeSpins
    })

    const session = engine.session({ seed: seed ?? 123 })
    const baseResult = session.act('spin') as AncientDragonBaseResult

    expect(baseResult.type).toBe('BASE')
    expect(baseResult.sc).toBeDefined()
    expect(baseResult.grid).toHaveLength(5)
    expect(baseResult.grid[0]).toHaveLength(3)
    expect(Array.isArray(baseResult.hits)).toBe(true)

    if (baseResult.triggeredFreeSpins) {
      expect(session.sm.state.freeSpins).not.toBeNull()
      const freeResult = session.act('next') as AncientDragonFreeResult | null
      expect(freeResult?.type).toBe('FREE')
      expect(freeResult?.grid).toHaveLength(5)
      expect(Array.isArray(freeResult?.hits)).toBe(true)
    }
  })

  it('resets free-spin state on a new base spin', () => {
    const session = engine.session({ seed: 42 })
    session.scenario('withFreeSpins', { totalWin: 100, spinsRemaining: 5 })

    session.act('spin')
    expect(session.sm.state.freeSpins).toBeNull()
  })
})
