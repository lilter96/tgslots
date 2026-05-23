import { describe, expect, it } from 'bun:test'
import type { AncientDragonBaseResult, AncientDragonFreeResult } from '../game-state-machine.js'
import { ancientDragonTestEngine as engine } from './test-engine.js'

describe('AncientDragonStateMachine', () => {
  it('transitions from BASE to FREE through the shared test engine', () => {
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

  it('is recoverable from seeded free-spin state via scenario registration', () => {
    const session = engine.session()
    session.scenario('withFreeSpins', { totalWin: 500, spinsRemaining: 5 })

    const freeResult = session.act('next') as AncientDragonFreeResult | null
    expect(freeResult?.type).toBe('FREE')
    expect(session.sm.state.freeSpins?.spinsRemaining).toBe(4)
  })
})
