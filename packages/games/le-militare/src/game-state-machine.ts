import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { MIN_SCATTERS, FREE_SPIN_AWARDS } from './constants.js'
import { LE_MILITARE_SAMPLER, BUY_BONUS_SAMPLER } from './logic.js'
import type { LeMilitareSpinResult } from './types.js'

// ─── State ────────────────────────────────────────────────────────────────

export interface LeMilitareFreeSpinsState {
  triggeringWager: Wager
  spinsRemaining: number
  totalWin: number
  armedReels: Set<number>
  multiplierSum: number
}

export interface LeMilitareState {
  lastGrid: number[][] | null
  freeSpins: LeMilitareFreeSpinsState | null
  lastSpinResult: LeMilitareSpinResult | null
}

// ─── Results ──────────────────────────────────────────────────────────────

export interface LeMilitareBaseResult extends SpinResult {
  type: 'BASE'
  scatterCount: number
  triggeredFreeSpins: boolean
  freeSpinsAwarded: number
  steps: LeMilitareSpinResult['steps']
  multiplierSum: number
  finalWin: number
  state: { freeSpinsLeft: number; totalFreeSpinWin: number; sessionMultiplierSum: number }
}

export interface LeMilitareFreeResult extends SpinResult {
  type: 'FREE'
  scatterCount: number
  retriggered: boolean
  freeSpinsAwarded: number
  steps: LeMilitareSpinResult['steps']
  multiplierSum: number
  finalWin: number
  state: { freeSpinsLeft: number; totalFreeSpinWin: number; sessionMultiplierSum: number }
}

export interface LeMilitareBuyResult extends SpinResult {
  type: 'BUY'
  scatterCount: number
  triggeredFreeSpins: true
  freeSpinsAwarded: number
  steps: LeMilitareSpinResult['steps']
  multiplierSum: number
  finalWin: number
  state: { freeSpinsLeft: number; totalFreeSpinWin: number; sessionMultiplierSum: number }
}

export type LeMilitareResult = LeMilitareBaseResult | LeMilitareFreeResult | LeMilitareBuyResult

// ─── State Machine ────────────────────────────────────────────────────────

export class LeMilitareStateMachine implements StateMachine<LeMilitareResult, LeMilitareState> {
  private _state: LeMilitareState

  constructor(initialState?: LeMilitareState) {
    this._state = initialState ?? { lastGrid: null, freeSpins: null, lastSpinResult: null }
  }

  get state(): LeMilitareState {
    return this._state
  }

  private _freeSpinState(): {
    freeSpinsLeft: number
    totalFreeSpinWin: number
    sessionMultiplierSum: number
  } {
    return {
      freeSpinsLeft: this._state.freeSpins?.spinsRemaining ?? 0,
      totalFreeSpinWin: this._state.freeSpins?.totalWin ?? 0,
      sessionMultiplierSum: this._state.freeSpins?.multiplierSum ?? 0,
    }
  }

  spin(rng: Rng, wager: Wager): LeMilitareBaseResult {
    // Reset any previous session
    this._state.freeSpins = null
    this._state.lastSpinResult = null

    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })
    const result = sampler.sample(rng)

    this._state.lastGrid = result.initialGrid
    this._state.lastSpinResult = result

    if (result.triggeredFreeSpins) {
      this._state.freeSpins = {
        triggeringWager: wager,
        spinsRemaining: result.freeSpinsAwarded,
        totalWin: 0,
        armedReels: new Set(),
        multiplierSum: 0,
      }
    }

    return {
      type: 'BASE',
      win: result.finalWin,
      components: { total: result.finalWin },
      scatterCount: result.scatterCount,
      triggeredFreeSpins: result.triggeredFreeSpins,
      freeSpinsAwarded: result.freeSpinsAwarded,
      steps: result.steps,
      multiplierSum: result.multiplierSum,
      finalWin: result.finalWin,
      state: this._freeSpinState(),
    }
  }

  freeGameSpin(rng: Rng): LeMilitareFreeResult {
    if (!this._state.freeSpins || this._state.freeSpins.spinsRemaining <= 0) {
      throw new Error('No free spins remaining')
    }

    this._state.freeSpins.spinsRemaining--
    const { triggeringWager, armedReels, multiplierSum } = this._state.freeSpins

    const sampler = LE_MILITARE_SAMPLER(triggeringWager, {
      isFreeSpin: true,
      carryArmedReels: armedReels,
      carryMultiplierSum: multiplierSum,
    })
    const result = sampler.sample(rng)

    this._state.lastGrid = result.initialGrid
    this._state.lastSpinResult = result
    this._state.freeSpins.totalWin += result.finalWin

    // Update session-persistent state
    for (const reel of result.endArmedReels) {
      this._state.freeSpins.armedReels.add(reel)
    }
    this._state.freeSpins.multiplierSum = result.endMultiplierSum

    // Handle retrigger
    const retriggered = result.scatterCount >= MIN_SCATTERS
    let addedSpins = 0
    if (retriggered) {
      for (let n = result.scatterCount; n >= MIN_SCATTERS; n--) {
        const award = FREE_SPIN_AWARDS[n]
        if (award !== undefined) {
          addedSpins = award
          break
        }
      }
      this._state.freeSpins.spinsRemaining += addedSpins
    }

    return {
      type: 'FREE',
      win: result.finalWin,
      components: { total: result.finalWin },
      scatterCount: result.scatterCount,
      retriggered,
      freeSpinsAwarded: addedSpins,
      steps: result.steps,
      multiplierSum: result.multiplierSum,
      finalWin: result.finalWin,
      state: this._freeSpinState(),
    }
  }

  buyBonus(rng: Rng, wager: Wager): LeMilitareBuyResult {
    this._state.freeSpins = null
    this._state.lastSpinResult = null

    const result = BUY_BONUS_SAMPLER(wager).sample(rng)

    this._state.lastGrid = result.initialGrid
    this._state.lastSpinResult = result
    this._state.freeSpins = {
      triggeringWager: wager,
      spinsRemaining: result.freeSpinsAwarded,
      totalWin: 0,
      armedReels: new Set(),
      multiplierSum: 0,
    }

    return {
      type: 'BUY',
      win: result.finalWin,
      components: { total: result.finalWin },
      scatterCount: result.scatterCount,
      triggeredFreeSpins: true,
      freeSpinsAwarded: result.freeSpinsAwarded,
      steps: result.steps,
      multiplierSum: result.multiplierSum,
      finalWin: result.finalWin,
      state: this._freeSpinState(),
    }
  }

  next(rng: Rng): LeMilitareResult | null {
    if (this._state.freeSpins && this._state.freeSpins.spinsRemaining > 0) {
      return this.freeGameSpin(rng)
    }
    return null
  }
}
