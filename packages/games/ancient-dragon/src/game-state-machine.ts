import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { FREE_SPIN_WITH_SCATTER, SPIN_WITH_SCATTER } from './logic.js'

export interface AncientDragonState {
  freeSpinsLeft: number
}

export interface AncientDragonResult extends SpinResult {
  sc: number
}

export class AncientDragonStateMachine implements StateMachine<
  AncientDragonResult,
  AncientDragonState
> {
  private _state: AncientDragonState = { freeSpinsLeft: 0 }

  get state(): AncientDragonState {
    return this._state
  }

  spin(rng: Rng): AncientDragonResult {
    const result = SPIN_WITH_SCATTER.sample(rng)
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
    if (this._state.freeSpinsLeft <= 0) {
      return null
    }

    this._state.freeSpinsLeft--
    const result = FREE_SPIN_WITH_SCATTER.sample(rng)

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
