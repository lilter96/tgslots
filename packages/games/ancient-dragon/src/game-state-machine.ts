import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import type { PaylineHit } from '@tgslots/slots-core/paylines/types'
import { ANCIENT_DRAGON_SAMPLER } from './logic.js'

export interface FreeSpinState {
  triggeringWager: Wager
  totalWin: number
  spinsRemaining: number
}

export interface AncientDragonState {
  freeSpins: FreeSpinState | null
}

export interface AncientDragonBaseResult extends SpinResult {
  type: 'BASE'
  sc: number
  triggeredFreeSpins: boolean
  grid: number[][]
  hits: readonly PaylineHit[]
}

export interface AncientDragonFreeResult extends SpinResult {
  type: 'FREE'
  sc: number
  retriggeredFreeSpins: boolean
  grid: number[][]
  hits: readonly PaylineHit[]
}

export type AncientDragonResult = AncientDragonBaseResult | AncientDragonFreeResult

export class AncientDragonStateMachine implements StateMachine<
  AncientDragonResult,
  AncientDragonState
> {
  private _state: AncientDragonState

  constructor(initialState?: AncientDragonState) {
    this._state = initialState ?? { freeSpins: null }
  }

  get state(): AncientDragonState {
    return this._state
  }

  baseGameSpin(rng: Rng, wager: Wager): AncientDragonBaseResult {
    const sampler = ANCIENT_DRAGON_SAMPLER(wager)
    const result = sampler.sample(rng)
    const isTrigger = result.sc >= 3

    if (isTrigger) {
      this._state.freeSpins = {
        triggeringWager: wager,
        totalWin: 0,
        spinsRemaining: 10,
      }
    }

    return {
      type: 'BASE',
      win: result.win,
      sc: result.sc,
      triggeredFreeSpins: isTrigger,
      grid: result.grid,
      hits: result.hits,
    }
  }

  freeGameSpin(rng: Rng): AncientDragonFreeResult {
    if (!this._state.freeSpins || this._state.freeSpins.spinsRemaining <= 0) {
      throw new Error('No free spins remaining')
    }

    this._state.freeSpins.spinsRemaining--
    const wager = this._state.freeSpins.triggeringWager
    const sampler = ANCIENT_DRAGON_SAMPLER(wager)
    const result = sampler.sample(rng)

    this._state.freeSpins.totalWin += result.win

    const isTrigger = result.sc >= 3
    if (isTrigger) {
      this._state.freeSpins.spinsRemaining += 10
    }

    return {
      type: 'FREE',
      win: result.win,
      sc: result.sc,
      retriggeredFreeSpins: isTrigger,
      grid: result.grid,
      hits: result.hits,
    }
  }

  spin(rng: Rng, wager: Wager): AncientDragonResult {
    // Reset session-based state on new base spin
    this._state.freeSpins = null
    return this.baseGameSpin(rng, wager)
  }

  next(rng: Rng): AncientDragonResult | null {
    if (this._state.freeSpins && this._state.freeSpins.spinsRemaining > 0) {
      return this.freeGameSpin(rng)
    }
    return null
  }
}
