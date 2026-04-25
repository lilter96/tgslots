import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { FREE_SPIN_MULTIPLIER } from './constants.js'
import { WOODLAND_WHISPER_SAMPLER } from './logic.js'

export interface WoodlandWhisperState {
  freeSpinsLeft: number
  lastWager: Wager | null
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
    lastWager: null,
  }

  get state(): WoodlandWhisperState {
    return this._state
  }

  setWager(breakdown: Wager): void {
    this._state.lastWager = breakdown
  }

  spin(rng: Rng, wager: Wager): WoodlandWhisperResult {
    this._state.lastWager = wager

    const sampler = WOODLAND_WHISPER_SAMPLER(wager, false)
    const result = sampler.sample(rng)

    const isTrigger = result.sc >= 3
    if (isTrigger) {
      this._state.freeSpinsLeft += result.pickedBonus
    }

    return {
      ...result,
      type: 'BASE',
      isTrigger,
      featureType: isTrigger ? 'PickBonus' : undefined,
      scatters: result.sc,
      sc: result.sc,
    }
  }

  next(rng: Rng): WoodlandWhisperResult | null {
    if (this._state.freeSpinsLeft <= 0 || !this._state.lastWager) {
      return null
    }

    this._state.freeSpinsLeft--
    const sampler = WOODLAND_WHISPER_SAMPLER(this._state.lastWager, true)
    const result = sampler.sample(rng)

    // Free spin wins are multiplied by 2
    const win = result.win * FREE_SPIN_MULTIPLIER
    const isTrigger = result.sc >= 3

    if (isTrigger) {
      this._state.freeSpinsLeft += result.pickedBonus
    }

    return {
      ...result,
      win,
      type: 'FREE',
      isTrigger: false,
      isRetrigger: isTrigger,
      scatters: result.sc,
      sc: result.sc,
    }
  }
}
