import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { ANCIENT_DRAGON_SAMPLER } from './logic.js'

export interface AncientDragonState {
  freeSpinsLeft: number
  lastWager: Wager | null
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
    lastWager: null,
  }

  get state(): AncientDragonState {
    return this._state
  }

  spin(rng: Rng, wager: Wager): AncientDragonResult {
    this._state.lastWager = wager

    const sampler = ANCIENT_DRAGON_SAMPLER(wager)
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
    if (this._state.freeSpinsLeft <= 0 || !this._state.lastWager) {
      return null
    }

    this._state.freeSpinsLeft--
    const sampler = ANCIENT_DRAGON_SAMPLER(this._state.lastWager)
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
