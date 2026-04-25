import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
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

  spin(rng: Rng, wager: Wager): WoodlandWhisperResult {
    this._state.lastWager = wager

    const sampler = WOODLAND_WHISPER_SAMPLER(wager)
    const result = sampler.sample(rng)

    // Feature trigger logic
    const isTrigger = result.sc >= 3
    let featureType: string | undefined = undefined
    if (isTrigger) {
      featureType = 'PickBonus'
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
    if (this._state.freeSpinsLeft <= 0 || !this._state.lastWager) {
      return null
    }

    this._state.freeSpinsLeft--
    const sampler = WOODLAND_WHISPER_SAMPLER(this._state.lastWager)
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
