import type { Rng } from '@tgslots/math/rng/types'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { WOODLAND_WHISPER_SAMPLER } from './logic.js'

export interface FreeSpinState {
  triggeringWager: Wager
  totalWin: number
  spinsRemaining: number
}

export interface PickBonusState {
  board: number[]
  pickSequence: number[]
  currentIndex: number
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
  grid: number[][]
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
  grid: number[][]
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
    index: number
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

export type WoodlandWhisperResult =
  | WoodlandWhisperBaseResult
  | WoodlandWhisperFreeResult
  | WoodlandWhisperPickResult

export class WoodlandWhisperStateMachine implements StateMachine<
  WoodlandWhisperResult,
  WoodlandWhisperState
> {
  private _state: WoodlandWhisperState = {
    lastGrid: null,
    freeSpins: null,
    pickBonus: null,
  }

  get state(): WoodlandWhisperState {
    return this._state
  }

  baseGameSpin(rng: Rng, wager: Wager): WoodlandWhisperBaseResult {
    const sampler = WOODLAND_WHISPER_SAMPLER(wager, false)
    const result = sampler.sample(rng)

    this._state.lastGrid = result.grid

    const isTrigger = result.sc >= 3
    if (isTrigger && result.pickData) {
      this._state.pickBonus = {
        ...result.pickData,
        currentIndex: 0,
        winValue: result.pickedBonus,
        triggeringWager: wager,
      }
    }

    return {
      type: 'BASE',
      win: result.win,
      sc: result.sc,
      grid: result.grid,
      pickedBonus: result.pickedBonus,
      triggeredPickBonus: isTrigger,
      state: {
        freeSpinsLeft: this._state.freeSpins?.spinsRemaining ?? 0,
        totalFreeSpinWin: this._state.freeSpins?.totalWin ?? 0,
      },
    }
  }

  pickBall(): WoodlandWhisperPickResult {
    if (!this._state.pickBonus) {
      throw new Error('No active pick bonus')
    }

    const { board, pickSequence, currentIndex, winValue, triggeringWager } = this._state.pickBonus
    const pickIndex = pickSequence[currentIndex]!
    const pickValue = board[pickIndex]!

    // A match is found if this is the last pick in the sequence
    const isMatch = currentIndex === pickSequence.length - 1
    const nextIndex = currentIndex + 1

    const picksSoFar = pickSequence.slice(0, nextIndex)

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
      this._state.pickBonus.currentIndex = nextIndex
    }

    return {
      type: 'PICK',
      win: 0,
      pick: {
        index: pickIndex,
        value: pickValue,
        isMatch,
        board,
        picks: picksSoFar,
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
        ...result.pickData,
        currentIndex: 0,
        winValue: result.pickedBonus,
        triggeringWager: wager,
      }
    }

    return {
      type: 'FREE',
      win: result.win,
      sc: result.sc,
      grid: result.grid,
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

  next(_rng: Rng): WoodlandWhisperResult | null {
    if (this._state.pickBonus) {
      return this.pickBall()
    }

    if (this._state.freeSpins && this._state.freeSpins.spinsRemaining > 0) {
      return this.freeGameSpin(_rng)
    }

    return null
  }

  recordResultMetrics(
    collector: DataCollector,
    result: WoodlandWhisperResult,
    context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])
    const pickBonusBaseScope = collector.scope(['features', 'pick-bonus-base-game'])
    const pickBonusFreeScope = collector.scope(['features', 'pick-bonus-free-game'])

    if (result.type === 'BASE') {
      baseScope.payout('win', result.win, context.wager.totalWager)
      baseScope.distribution('scatter-count', String(result.sc ?? 0))
      if (result.win > 0) baseScope.count('winning-spins')

      if (result.triggeredPickBonus) {
        freeSpinScope.count('triggers')
        freeSpinScope.value('spins-awarded', result.pickedBonus ?? 0)
        pickBonusBaseScope.count('triggers')
        pickBonusBaseScope.value('spins-awarded', result.pickedBonus ?? 0)
      }
      return
    }

    if (result.type === 'PICK') {
      // Pick results themselves don't typically have individual payouts,
      // but we could record the progression here if needed.
      return
    }

    if (result.type === 'FREE') {
      freeSpinScope.count('spins-played')
      freeSpinScope.payout('spin-win', result.win)
      freeSpinScope.distribution('scatter-count', String(result.sc ?? 0))
      if (result.win > 0) freeSpinScope.count('winning-spins')

      if (result.retriggeredPickBonus) {
        freeSpinScope.count('retriggers')
        freeSpinScope.value('spins-awarded', result.pickedBonus ?? 0)
        pickBonusFreeScope.count('retriggers')
        pickBonusFreeScope.value('spins-awarded', result.pickedBonus ?? 0)
      }
    }
  }

  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot, _wager: Wager): void {
    const freeSpinScope = collector.scope(['features', 'free-spins'])

    // Record on every round so ratio = feature_wins / total_bets = feature RTP
    freeSpinScope.payout('feature-rtp', round.winsByType.FREE ?? 0, round.bet)

    const hasFreeSpins = (round.countsByType.FREE ?? 0) > 0 || (round.countsByType.PICK ?? 0) > 0
    if (!hasFreeSpins) return

    freeSpinScope.payout('feature-win', round.winsByType.FREE ?? 0, round.bet)
    freeSpinScope.payout('round-win', round.totalWin, round.bet)
    freeSpinScope.value('total-spins-per-trigger', round.countsByType.FREE ?? 0)
  }
}
