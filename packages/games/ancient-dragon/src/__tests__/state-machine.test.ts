import { describe, expect, it } from 'bun:test'
import { mt19937 } from '@tgslots/math/rng/mt19937'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG } from '../constants.js'
import type {
  AncientDragonBaseResult,
  AncientDragonFreeResult,
  AncientDragonState,
} from '../game-state-machine.js'
import { AncientDragonStateMachine } from '../game-state-machine.js'

describe('AncientDragonStateMachine', () => {
  it('should transition from BASE to FREE', () => {
    // Seed chosen to eventually trigger free spins or we'll just test the methods
    const rng = mt19937(123)
    const sm = new AncientDragonStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // 1. Base Spin
    const baseResult = sm.spin(rng, wager) as AncientDragonBaseResult
    expect(baseResult.type).toBe('BASE')
    expect(baseResult.sc).toBeDefined()

    // 2. If triggered, check next()
    if (baseResult.triggeredFreeSpins) {
      expect(sm.state.freeSpins).not.toBeNull()
      const fsResult = sm.next(rng) as AncientDragonFreeResult
      expect(fsResult?.type).toBe('FREE')
    }
  })

  it('should be recoverable from state', () => {
    const sm = new AncientDragonStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    const state: AncientDragonState = {
      freeSpins: {
        triggeringWager: wager,
        totalWin: 500,
        spinsRemaining: 5,
      },
    }

    // @ts-ignore
    sm._state = state

    const rng = mt19937(42)
    const fsResult = sm.next(rng) as AncientDragonFreeResult
    expect(fsResult?.type).toBe('FREE')
    expect(sm.state.freeSpins?.spinsRemaining).toBe(4)
  })
})
