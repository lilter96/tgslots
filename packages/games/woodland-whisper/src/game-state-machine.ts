import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { FREE_SPIN_MULTIPLIER } from './constants.js'
import { FREE_SPIN_WITH_SCATTER, SPIN_WITH_SCATTER } from './logic.js'

export interface WoodlandWhisperState {
  freeSpinsLeft: number
}

export interface WoodlandWhisperResult extends SpinResult {
  sc: number
}

export class WoodlandWhisperStateMachine implements StateMachine<
  WoodlandWhisperResult,
  WoodlandWhisperState
> {
  private _state: WoodlandWhisperState = { freeSpinsLeft: 0 }

  get state(): WoodlandWhisperState {
    return this._state
  }

  spin(rng: Rng): WoodlandWhisperResult {
    const { pickedBonus, ...result } = SPIN_WITH_SCATTER.sample(rng)
    const isTrigger = result.sc >= 3

    if (isTrigger) {
      this._state.freeSpinsLeft = pickedBonus
    }

    return {
      ...result,
      type: 'BASE',
      isTrigger,
      scatters: result.sc,
      featureType: isTrigger ? 'PickBonus' : undefined,
      sc: result.sc,
    }
  }

  next(rng: Rng): WoodlandWhisperResult | null {
    if (this._state.freeSpinsLeft <= 0) {
      return null
    }

    this._state.freeSpinsLeft--
    const { pickedBonus, ...result } = FREE_SPIN_WITH_SCATTER.sample(rng)
    const isRetrigger = result.sc >= 3

    if (isRetrigger) {
      this._state.freeSpinsLeft += pickedBonus
    }

    return {
      ...result,
      win: result.win * FREE_SPIN_MULTIPLIER,
      type: 'FREE',
      isTrigger: false,
      isRetrigger,
      scatters: result.sc,
      featureType: 'FreeSpin',
      sc: result.sc,
    }
  }
}
