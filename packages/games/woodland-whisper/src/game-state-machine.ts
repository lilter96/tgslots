import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { WagerBreakdown } from '@tgslots/slots-core/betting/wager'
import { BET_CONFIG } from './constants.js'
import { WOODLAND_WHISPER_SAMPLER } from './logic.js'

export interface WoodlandWhisperState {
  freeSpinsLeft: number
  breakdown: WagerBreakdown | null
}

export interface WoodlandWhisperResult extends SpinResult {
  sc: number
}

export class WoodlandWhisperStateMachine implements StateMachine<
  WoodlandWhisperResult,
  WoodlandWhisperState
> {
  private _state: WoodlandWhisperState = {
    freeSpinsLeft: 0,
    breakdown: null,
  }

  get state(): WoodlandWhisperState {
    return this._state
  }

  setWager(breakdown: WagerBreakdown): void {
    this._state.breakdown = breakdown
  }

  spin(rng: Rng): WoodlandWhisperResult {
    // If setWager was not called, fallback to multiplier 1
    if (!this._state.breakdown) {
      this._state.breakdown = WagerBreakdown.fromBet(1, BET_CONFIG)
    }
    const breakdown = this._state.breakdown

    const sampler = WOODLAND_WHISPER_SAMPLER(breakdown)
    const result = sampler.sample(rng)

    // Feature trigger logic
    const isTrigger = result.sc >= 3
    let featureType: string | undefined = undefined
    if (isTrigger) {
      featureType = 'PickBonus'
      // Note: in Woodland Whisper, PickBonus can also award FreeSpins.
      // For simplified simulation, we'll assume PickBonus is always triggered.
      // If we wanted to simulate free spins, we'd need more complex state transitions.
    }

    return {
      ...result,
      type: 'BASE',
      isTrigger,
      featureType,
      scatters: result.sc,
      sc: result.sc,
    }
  }

  next(rng: Rng): WoodlandWhisperResult | null {
    if (this._state.freeSpinsLeft <= 0 || !this._state.breakdown) {
      return null
    }

    this._state.freeSpinsLeft--
    const sampler = WOODLAND_WHISPER_SAMPLER(this._state.breakdown)
    const result = sampler.sample(rng)

    const isTrigger = result.sc >= 3

    return {
      ...result,
      type: 'FREE',
      isTrigger: false,
      isRetrigger: isTrigger,
      scatters: result.sc,
      sc: result.sc,
    }
  }
}
