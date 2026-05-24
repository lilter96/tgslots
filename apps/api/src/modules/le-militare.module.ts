import type { Rng } from '@tgslots/math/rng/types'
import { Wager } from '@tgslots/slots-core/betting'
import { LeMilitareStateMachine, BET_CONFIG } from '@tgslots/le-militare'
import type {
  LeMilitareResult,
  LeMilitareState,
  LeMilitareFreeSpinsState,
} from '@tgslots/le-militare'
import type { IGameModule } from '../game-module.js'
import type { LeMilitareSerializedState, LMFreeSpinSerialized } from './le-militare-state.js'

// Ensure declaration merge is loaded
import '../types/le-militare.reg.js'

type LMAction = 'spin' | 'buybonus' | 'freespin' | 'state'
type LMPayload = { multiplier?: number }

export class LeMilitareModule implements IGameModule<'le-militare'> {
  readonly gameId = 'le-militare' as const

  defaultState(_rng: Rng): LeMilitareSerializedState {
    return { lastGrid: null, freeSpins: null }
  }

  validateAction(
    state: LeMilitareSerializedState,
    action: LMAction,
    payload: LMPayload,
  ): string | null {
    switch (action) {
      case 'spin':
      case 'buybonus': {
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
    state: LeMilitareSerializedState,
    action: LMAction,
    payload: LMPayload,
  ): { state: LeMilitareSerializedState; result?: LeMilitareResult } {
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
      case 'buybonus': {
        const wager = new Wager(payload.multiplier!, BET_CONFIG)
        const result = machine.buyBonus(rng, wager)
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

  private hydrate(s: LeMilitareSerializedState): LeMilitareStateMachine {
    const freeSpins: LeMilitareFreeSpinsState | null = s.freeSpins
      ? {
          triggeringWager: new Wager(s.freeSpins.triggeringMultiplier, BET_CONFIG),
          spinsRemaining: s.freeSpins.spinsRemaining,
          totalWin: s.freeSpins.totalWin,
          armedReels: new Set(s.freeSpins.armedReels),
          multiplierSum: s.freeSpins.multiplierSum,
        }
      : null

    const runtimeState: LeMilitareState = {
      lastGrid: s.lastGrid,
      freeSpins,
      lastSpinResult: null,
      roundWin: 0,
    }
    return new LeMilitareStateMachine(runtimeState)
  }

  private dehydrate(machine: LeMilitareStateMachine): LeMilitareSerializedState {
    const s = machine.state

    const freeSpins: LMFreeSpinSerialized | null = s.freeSpins
      ? {
          triggeringMultiplier: s.freeSpins.triggeringWager.multiplier,
          spinsRemaining: s.freeSpins.spinsRemaining,
          totalWin: s.freeSpins.totalWin,
          armedReels: Array.from(s.freeSpins.armedReels),
          multiplierSum: s.freeSpins.multiplierSum,
        }
      : null

    return { lastGrid: s.lastGrid, freeSpins }
  }
}
