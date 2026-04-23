import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { Bet, WagerBreakdown } from '@tgslots/slots-core/betting/wager'
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

  /**
   * Note: The current StateMachine interface spin(rng: Rng) doesn't accept a wager.
   * We use the default BET_CONFIG.baseCost for simulations.
   */
  spin(rng: Rng): WoodlandWhisperResult {
    const wager = BET_CONFIG.baseCost
    const bet = Bet.fromTotalWager(wager, BET_CONFIG)
    const breakdown = WagerBreakdown.fromBet(bet, BET_CONFIG)
    this._state.breakdown = breakdown

    const sampler = WOODLAND_WHISPER_SAMPLER(breakdown, false)
    const { pickedBonus, ...result } = sampler.sample(rng)
    const isTrigger = result.sc >= 3

    if (isTrigger) {
      this._state.freeSpinsLeft = pickedBonus
    }

    return {
      ...result,
      type: 'BASE',
      isTrigger,
      scatters: result.sc,
      featureType: isTrigger ? `PickBonus ${pickedBonus.toString()}` : undefined,
      sc: result.sc,
    }
  }

  next(rng: Rng): WoodlandWhisperResult | null {
    if (this._state.freeSpinsLeft <= 0 || !this._state.breakdown) {
      return null
    }

    this._state.freeSpinsLeft--
    const sampler = WOODLAND_WHISPER_SAMPLER(this._state.breakdown, true)
    const { pickedBonus, ...result } = sampler.sample(rng)
    const isRetrigger = result.sc >= 3

    if (isRetrigger) {
      this._state.freeSpinsLeft += pickedBonus
    }

    return {
      ...result,
      type: 'FREE',
      isTrigger: false,
      isRetrigger,
      scatters: result.sc,
      featureType: 'FreeSpin',
      sc: result.sc,
    }
  }
}
