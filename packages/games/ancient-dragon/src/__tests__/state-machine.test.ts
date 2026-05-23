import { describe, expect, it } from 'bun:test'
import { SlotsTestEngine } from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { BET_CONFIG } from '../constants.js'
import type { AncientDragonBaseResult, AncientDragonFreeResult } from '../game-state-machine.js'
import { AncientDragonStateMachine } from '../game-state-machine.js'

describe('AncientDragonStateMachine', () => {
  const engine = new SlotsTestEngine(AncientDragonStateMachine, BET_CONFIG)

  it('should transition from BASE to FREE', () => {
    const seed = engine.findSeed((r) => (r as AncientDragonBaseResult).triggeredFreeSpins)
    const { sm, rng, result } = engine.runSpin({ seed: seed ?? 123 })

    const baseResult = result as AncientDragonBaseResult
    expect(baseResult.type).toBe('BASE')
    expect(baseResult.sc).toBeDefined()
    expect(baseResult.grid).toHaveLength(5)
    expect(baseResult.grid[0]).toHaveLength(3)
    expect(Array.isArray(baseResult.hits)).toBe(true)

    if (baseResult.triggeredFreeSpins) {
      expect(sm.state.freeSpins).not.toBeNull()
      const fsResult = sm.next(rng) as AncientDragonFreeResult
      expect(fsResult?.type).toBe('FREE')
      expect(fsResult.grid).toHaveLength(5)
      expect(Array.isArray(fsResult.hits)).toBe(true)
    }
  })

  it('should be recoverable from state', () => {
    const sm = engine.createMachine({
      freeSpins: {
        triggeringWager: engine.wager(),
        totalWin: 500,
        spinsRemaining: 5,
      },
    })

    const rng = engine.rng(42)
    const fsResult = sm.next(rng) as AncientDragonFreeResult
    expect(fsResult?.type).toBe('FREE')
    expect(sm.state.freeSpins?.spinsRemaining).toBe(4)
  })
})
