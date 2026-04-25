import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { WagerBreakdown } from '@tgslots/slots-core/betting/wager'
import { BET_CONFIG } from './constants.js'
import { ANCIENT_DRAGON_SAMPLER } from './logic.js'

export interface AncientDragonState {
  freeSpinsLeft: number
  breakdown: WagerBreakdown | null
}

export interface AncientDragonResult extends SpinResult {
  sc: number
}

export class AncientDragonStateMachine implements StateMachine<
  AncientDragonResult,
  AncientDragonState
> {
  private _state: AncientDragonState = {
    freeSpinsLeft: 0,
    breakdown: null,
  }

  get state(): AncientDragonState {
    return this._state
  }

  setWager(breakdown: WagerBreakdown): void {
    this._state.breakdown = breakdown
  }

  spin(rng: Rng): AncientDragonResult {
    // If setWager was not called, fallback to multiplier 1
    if (!this._state.breakdown) {
      this._state.breakdown = WagerBreakdown.fromBet(1, BET_CONFIG)
    }
    const breakdown = this._state.breakdown

    const sampler = ANCIENT_DRAGON_SAMPLER(breakdown)
    const result = sampler.sample(rng)
    const isTrigger = result.sc >= 3
    if (isTrigger) {
      this._state.freeSpinsLeft += 10
    }
    return {
      ...result,
      type: 'BASE',
      isTrigger,
      scatters: result.sc,
      sc: result.sc,
    }
  }

  next(rng: Rng): AncientDragonResult | null {
    if (this._state.freeSpinsLeft <= 0 || !this._state.breakdown) {
      return null
    }

    this._state.freeSpinsLeft--
    const sampler = ANCIENT_DRAGON_SAMPLER(this._state.breakdown)
    const result = sampler.sample(rng)

    const isTrigger = result.sc >= 3
    if (isTrigger) {
      this._state.freeSpinsLeft += 10
    }

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
