import type { Rng } from '@tgslots/math/rng/types'
import { Wager } from '@tgslots/slots-core/betting'
import { WoodlandWhisperStateMachine } from '@tgslots/woodland-whisper/game-state-machine'
import { BET_CONFIG } from '@tgslots/woodland-whisper/constants'
import { INITIAL_GRID_SAMPLER } from '@tgslots/woodland-whisper/logic'
import type { IGameModule } from '../game-module.js'
import type {
  WoodlandWhisperSerializedState,
  WWFreeSpinSerialized,
  WWPickBonusSerialized,
} from './woodland-whisper-state.js'
import type {
  FreeSpinState,
  PickBonusState,
  WoodlandWhisperState,
  WoodlandWhisperResult,
} from '@tgslots/woodland-whisper/game-state-machine'

// Ensure declaration merge is loaded
import '../types/woodland-whisper.reg.js'

type WWAction = 'spin' | 'buybonus' | 'freespin' | 'pick' | 'state'
type WWPayload = { multiplier?: number; userIndex?: number }

export class WoodlandWhisperModule implements IGameModule<'woodland-whisper'> {
  readonly gameId = 'woodland-whisper' as const

  defaultState(rng: Rng): WoodlandWhisperSerializedState {
    const result = INITIAL_GRID_SAMPLER.sample(rng)
    return { lastGrid: result.grid, freeSpins: null, pickBonus: null }
  }

  validateAction(
    state: WoodlandWhisperSerializedState,
    action: WWAction,
    payload: WWPayload,
  ): string | null {
    switch (action) {
      case 'spin':
      case 'buybonus': {
        if (typeof payload.multiplier !== 'number' || payload.multiplier < 1) {
          return 'multiplier must be a positive integer'
        }
        if (state.freeSpins && state.freeSpins.spinsRemaining > 0) {
          return 'Complete free spins before starting a new round'
        }
        if (state.pickBonus) {
          return 'Complete pick bonus before starting a new round'
        }
        return null
      }
      case 'freespin': {
        if (!state.freeSpins || state.freeSpins.spinsRemaining <= 0) {
          return 'No free spins remaining'
        }
        if (state.pickBonus) {
          return 'Pick bonus must be completed before playing free spins'
        }
        return null
      }
      case 'pick': {
        if (!state.pickBonus) return 'No active pick bonus'
        if (typeof payload.userIndex !== 'number') return 'userIndex required'
        if (payload.userIndex < 0 || payload.userIndex >= state.pickBonus.board.length) {
          return `userIndex must be between 0 and ${state.pickBonus.board.length - 1}`
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
    state: WoodlandWhisperSerializedState,
    action: WWAction,
    payload: WWPayload,
  ): { state: WoodlandWhisperSerializedState; result?: WoodlandWhisperResult } {
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
      case 'pick': {
        const result = machine.pickBall(payload.userIndex!)
        return { state: this.dehydrate(machine), result }
      }
      default:
        throw new Error(`Unhandled action: ${String(action)}`)
    }
  }

  private hydrate(s: WoodlandWhisperSerializedState): WoodlandWhisperStateMachine {
    const freeSpins: FreeSpinState | null = s.freeSpins
      ? {
          triggeringWager: new Wager(s.freeSpins.triggeringMultiplier, BET_CONFIG),
          totalWin: s.freeSpins.totalWin,
          spinsRemaining: s.freeSpins.spinsRemaining,
        }
      : null

    const pickBonus: PickBonusState | null = s.pickBonus
      ? {
          board: s.pickBonus.board,
          pickSequence: s.pickBonus.pickSequence,
          currentPickIndex: s.pickBonus.currentPickIndex,
          userPicks: s.pickBonus.userPicks,
          revealedValues: s.pickBonus.revealedValues,
          winValue: s.pickBonus.winValue,
          triggeringWager: new Wager(s.pickBonus.triggeringMultiplier, BET_CONFIG),
        }
      : null

    const runtimeState: WoodlandWhisperState = {
      lastGrid: s.lastGrid,
      freeSpins,
      pickBonus,
    }
    return new WoodlandWhisperStateMachine(runtimeState)
  }

  private dehydrate(machine: WoodlandWhisperStateMachine): WoodlandWhisperSerializedState {
    const s = machine.state

    const freeSpins: WWFreeSpinSerialized | null = s.freeSpins
      ? {
          triggeringMultiplier: s.freeSpins.triggeringWager.multiplier,
          totalWin: s.freeSpins.totalWin,
          spinsRemaining: s.freeSpins.spinsRemaining,
        }
      : null

    const pickBonus: WWPickBonusSerialized | null = s.pickBonus
      ? {
          board: s.pickBonus.board,
          pickSequence: s.pickBonus.pickSequence,
          currentPickIndex: s.pickBonus.currentPickIndex,
          userPicks: s.pickBonus.userPicks,
          revealedValues: s.pickBonus.revealedValues,
          winValue: s.pickBonus.winValue,
          triggeringMultiplier: s.pickBonus.triggeringWager.multiplier,
        }
      : null

    return { lastGrid: s.lastGrid, freeSpins, pickBonus }
  }
}
