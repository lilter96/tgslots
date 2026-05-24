import type { Rng } from '@tgslots/math/rng/types'
import type { SpinResult, StateMachine } from '@tgslots/slots-simulation-engine'
import type { PaylineHit } from '@tgslots/slots-core/paylines/types'
import { Wager } from '@tgslots/slots-core/betting'
import { WOODLAND_WHISPER_SAMPLER, BUY_BONUS_SAMPLER, INITIAL_GRID_SAMPLER } from './logic.js'

export interface FreeSpinState {
  triggeringWager: Wager
  totalWin: number
  spinsRemaining: number
}

export interface PickBonusState {
  board: number[]
  pickSequence: number[]
  currentPickIndex: number
  userPicks: number[]
  revealedValues: number[]
  winValue: number
  triggeringWager: Wager
}

export interface WoodlandWhisperState {
  lastGrid: number[][] | null
  freeSpins: FreeSpinState | null
  pickBonus: PickBonusState | null
}

export interface WoodlandWhisperBaseResult extends SpinResult {
  type: 'BASE'
  sc: number
  scatterWin: number
  grid: number[][]
  hits: PaylineHit[]
  pickedBonus: number
  triggeredPickBonus: boolean
  state: {
    freeSpinsLeft: number
    totalFreeSpinWin: number
  }
}

export interface WoodlandWhisperFreeResult extends SpinResult {
  type: 'FREE'
  sc: number
  scatterWin: number
  grid: number[][]
  hits: PaylineHit[]
  pickedBonus: number
  retriggeredPickBonus: boolean
  state: {
    freeSpinsLeft: number
    totalFreeSpinWin: number
  }
}

export interface WoodlandWhisperPickResult extends SpinResult {
  type: 'PICK'
  pick: {
    userIndex: number
    revealedIndex: number
    value: number
    isMatch: boolean
    board: number[]
    picks: number[]
  }
  state: {
    freeSpinsLeft: number
    totalFreeSpinWin: number
  }
}

export interface WoodlandWhisperBuyResult extends SpinResult {
  type: 'BUY'
  sc: number
  scatterWin: number
  grid: number[][]
  hits: PaylineHit[]
  pickedBonus: number
  triggeredPickBonus: true
  state: {
    freeSpinsLeft: number
    totalFreeSpinWin: number
  }
}

export type WoodlandWhisperResult =
  | WoodlandWhisperBaseResult
  | WoodlandWhisperFreeResult
  | WoodlandWhisperPickResult
  | WoodlandWhisperBuyResult

export class WoodlandWhisperStateMachine implements StateMachine<
  WoodlandWhisperResult,
  WoodlandWhisperState
> {
  private _state: WoodlandWhisperState
  constructor(initialState?: WoodlandWhisperState) {
    this._state = initialState ?? { lastGrid: null, freeSpins: null, pickBonus: null }
  }

  get state(): WoodlandWhisperState {
    return this._state
  }

  /**
   * Initializes the state with a random non-winning grid.
   * Used for brand new sessions to provide a valid but neutral initial screen.
   */
  initInitialGrid(rng: Rng): void {
    const result = INITIAL_GRID_SAMPLER.sample(rng)
    this._state.lastGrid = result.grid
  }

  baseGameSpin(rng: Rng, wager: Wager): WoodlandWhisperBaseResult {
    const sampler = WOODLAND_WHISPER_SAMPLER(wager, false)
    const result = sampler.sample(rng)

    this._state.lastGrid = result.grid

    const isTrigger = result.sc >= 3
    if (isTrigger && result.pickData) {
      this._state.pickBonus = {
        board: result.pickData.board,
        pickSequence: result.pickData.pickSequence,
        currentPickIndex: 0,
        userPicks: [],
        revealedValues: [],
        winValue: result.pickedBonus,
        triggeringWager: wager,
      }
    }

    return {
      type: 'BASE',
      win: result.win,
      components: { total: result.win, scatter: result.scatterWin },
      scatterWin: result.scatterWin,
      sc: result.sc,
      grid: result.grid,
      hits: result.hits,
      pickedBonus: result.pickedBonus,
      triggeredPickBonus: isTrigger,
      state: {
        freeSpinsLeft: this._state.freeSpins?.spinsRemaining ?? 0,
        totalFreeSpinWin: this._state.freeSpins?.totalWin ?? 0,
      },
    }
  }

  pickBall(userIndex: number): WoodlandWhisperPickResult {
    if (!this._state.pickBonus) {
      throw new Error('No active pick bonus')
    }

    const {
      board,
      pickSequence,
      currentPickIndex,
      userPicks,
      revealedValues,
      winValue,
      triggeringWager,
    } = this._state.pickBonus

    // The value revealed is always the next card in the predetermined sequence,
    // regardless of which card the user tapped.
    const revealedIndex = pickSequence[currentPickIndex]!
    const value = board[revealedIndex]!
    const newUserPicks = [...userPicks, userIndex]
    const newRevealedValues = [...revealedValues, value]

    const matchCount = newRevealedValues.filter((v) => v === winValue).length
    const isMatch = matchCount === 2

    if (isMatch) {
      if (!this._state.freeSpins) {
        this._state.freeSpins = {
          triggeringWager,
          totalWin: 0,
          spinsRemaining: 0,
        }
      }
      this._state.freeSpins.spinsRemaining += winValue
      this._state.pickBonus = null
    } else {
      this._state.pickBonus.currentPickIndex = currentPickIndex + 1
      this._state.pickBonus.userPicks = newUserPicks
      this._state.pickBonus.revealedValues = newRevealedValues
    }

    return {
      type: 'PICK',
      win: 0,
      pick: {
        userIndex,
        revealedIndex,
        value,
        isMatch,
        board,
        picks: newUserPicks,
      },
      state: {
        freeSpinsLeft: this._state.freeSpins?.spinsRemaining ?? 0,
        totalFreeSpinWin: this._state.freeSpins?.totalWin ?? 0,
      },
    }
  }

  freeGameSpin(rng: Rng): WoodlandWhisperFreeResult {
    if (!this._state.freeSpins || this._state.freeSpins.spinsRemaining <= 0) {
      throw new Error('No free spins remaining')
    }

    this._state.freeSpins.spinsRemaining--
    const wager = this._state.freeSpins.triggeringWager
    const sampler = WOODLAND_WHISPER_SAMPLER(wager, true)
    const result = sampler.sample(rng)

    this._state.lastGrid = result.grid
    this._state.freeSpins.totalWin += result.win

    const isTrigger = result.sc >= 3
    if (isTrigger && result.pickData) {
      this._state.pickBonus = {
        board: result.pickData.board,
        pickSequence: result.pickData.pickSequence,
        currentPickIndex: 0,
        userPicks: [],
        revealedValues: [],
        winValue: result.pickedBonus,
        triggeringWager: wager,
      }
    }

    return {
      type: 'FREE',
      win: result.win,
      components: { total: result.win, scatter: result.scatterWin },
      scatterWin: result.scatterWin,
      sc: result.sc,
      grid: result.grid,
      hits: result.hits,
      pickedBonus: result.pickedBonus,
      retriggeredPickBonus: isTrigger,
      state: {
        freeSpinsLeft: this._state.freeSpins.spinsRemaining,
        totalFreeSpinWin: this._state.freeSpins.totalWin,
      },
    }
  }

  spin(rng: Rng, wager: Wager): WoodlandWhisperResult {
    this._state.freeSpins = null
    this._state.pickBonus = null

    return this.baseGameSpin(rng, wager)
  }

  buyBonus(rng: Rng, wager: Wager): WoodlandWhisperBuyResult {
    this._state.freeSpins = null
    this._state.pickBonus = null

    const result = BUY_BONUS_SAMPLER(wager).sample(rng)

    this._state.lastGrid = result.grid
    this._state.pickBonus = {
      board: result.pickData!.board,
      pickSequence: result.pickData!.pickSequence,
      currentPickIndex: 0,
      userPicks: [],
      revealedValues: [],
      winValue: result.pickedBonus,
      triggeringWager: wager,
    }

    return {
      type: 'BUY',
      win: result.win,
      components: { total: result.win, scatter: result.scatterWin },
      scatterWin: result.scatterWin,
      sc: result.sc,
      grid: result.grid,
      hits: result.hits,
      pickedBonus: result.pickedBonus,
      triggeredPickBonus: true,
      state: {
        freeSpinsLeft: 0,
        totalFreeSpinWin: 0,
      },
    }
  }

  next(_rng: Rng): WoodlandWhisperResult | null {
    if (this._state.freeSpins && this._state.freeSpins.spinsRemaining > 0) {
      return this.freeGameSpin(_rng)
    }

    return null
  }
}
