import type { Rng } from '@tgslots/math/rng/types'
import { Wager } from '@tgslots/slots-core/betting'
import { AncientDragonStateMachine } from '@tgslots/ancient-dragon'
import { BET_CONFIG } from '@tgslots/ancient-dragon'
import type {
  AncientDragonState,
  FreeSpinState,
  AncientDragonResult,
} from '@tgslots/ancient-dragon'
import type { IGameModule } from '../game-module.js'
import type { AncientDragonSerializedState, ADFreeSpinSerialized } from './ancient-dragon-state.js'

// Ensure declaration merge is loaded
import '../types/ancient-dragon.reg.js'

type ADAction = 'spin' | 'freespin' | 'state'
type ADPayload = { multiplier?: number }

export class AncientDragonModule implements IGameModule<'ancient-dragon'> {
  readonly gameId = 'ancient-dragon' as const

  defaultState(_rng: Rng): AncientDragonSerializedState {
    return { freeSpins: null }
  }

  validateAction(
    state: AncientDragonSerializedState,
    action: ADAction,
    payload: ADPayload,
  ): string | null {
    switch (action) {
      case 'spin': {
        if (typeof payload.multiplier !== 'number' || payload.multiplier < 1) {
          return 'multiplier must be a positive integer'
        }
        return null
      }
      case 'freespin': {
        if (!state.freeSpins || state.freeSpins.spinsRemaining <= 0) {
          return 'No free spins remaining'
        }
        return null
      }
      case 'state':
        return null
      default:
        return `Unknown action: ${String(action)}`
    }
  }

  execute(
    rng: Rng,
    state: AncientDragonSerializedState,
    action: ADAction,
    payload: ADPayload,
  ): { state: AncientDragonSerializedState; result?: AncientDragonResult } {
    if (action === 'state') {
      return { state }
    }

    const machine = this.hydrate(state)

    switch (action) {
      case 'spin': {
        const wager = new Wager(payload.multiplier!, BET_CONFIG)
        const result = machine.spin(rng, wager)
        return { state: this.dehydrate(machine), result }
      }
      case 'freespin': {
        const result = machine.freeGameSpin(rng)
        return { state: this.dehydrate(machine), result }
      }
      default:
        throw new Error(`Unhandled action: ${String(action)}`)
    }
  }

  private hydrate(s: AncientDragonSerializedState): AncientDragonStateMachine {
    const freeSpins: FreeSpinState | null = s.freeSpins
      ? {
          triggeringWager: new Wager(s.freeSpins.triggeringMultiplier, BET_CONFIG),
          totalWin: s.freeSpins.totalWin,
          spinsRemaining: s.freeSpins.spinsRemaining,
        }
      : null

    const runtimeState: AncientDragonState = { freeSpins }
    return new AncientDragonStateMachine(runtimeState)
  }

  private dehydrate(machine: AncientDragonStateMachine): AncientDragonSerializedState {
    const s = machine.state

    const freeSpins: ADFreeSpinSerialized | null = s.freeSpins
      ? {
          triggeringMultiplier: s.freeSpins.triggeringWager.multiplier,
          totalWin: s.freeSpins.totalWin,
          spinsRemaining: s.freeSpins.spinsRemaining,
        }
      : null

    return { freeSpins }
  }
}
