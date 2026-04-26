import type { Rng } from '@tgslots/math/rng/types'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { WOODLAND_WHISPER_SAMPLER, generatePickBonus } from './logic.js'

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
}

export interface WoodlandWhisperState {
  lastGrid: number[][] | null
  freeSpins: FreeSpinState | null
  pickBonus: PickBonusState | null
}

export interface WoodlandWhisperResult extends SpinResult {
  sc?: number
  grid?: number[][]
  pickedBonus?: number
  triggeredPickBonus?: boolean
  retriggeredPickBonus?: boolean
  pick?: {
    index: number
    value: number
    isMatch: boolean
    board: number[]
    picks: number[]
  }
  // Current state snapshot for UI/Sim
  state: {
    freeSpinsLeft: number
    totalFreeSpinWin: number
  }
}

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

  baseGameSpin(rng: Rng, wager: Wager): WoodlandWhisperResult {
    const sampler = WOODLAND_WHISPER_SAMPLER(wager, false)
    const result = sampler.sample(rng)

    this._state.lastGrid = result.grid

    const isTrigger = result.sc >= 3
    if (isTrigger) {
      this._state.pickBonus = {
        ...generatePickBonus(result.pickedBonus).sample(rng),
        currentIndex: 0,
        winValue: result.pickedBonus,
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

  pickBall(rng: Rng): WoodlandWhisperResult {
    if (!this._state.pickBonus) {
      throw new Error('No active pick bonus')
    }

    const { board, pickSequence, currentIndex, winValue } = this._state.pickBonus
    const pickIndex = pickSequence[currentIndex]!
    const pickValue = board[pickIndex]!

    // A match is found if this is the last pick in the sequence
    const isMatch = currentIndex === pickSequence.length - 1
    const nextIndex = currentIndex + 1

    const picksSoFar = pickSequence.slice(0, nextIndex)

    if (isMatch) {
      if (this._state.freeSpins) {
        this._state.freeSpins.spinsRemaining += winValue
      } else {
        // This is safe because baseGameSpin or freeGameSpin must have set a wager
        // but we need to ensure we have a wager. In Woodland Whisper, wager is
        // passed to spin() which calls baseGameSpin.
        // If we are recovering from a state where freeSpins was null,
        // we should have a triggeringWager.
        // For simplicity, we assume baseGameSpin already occurred.
      }
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

  freeGameSpin(rng: Rng): WoodlandWhisperResult {
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
    if (isTrigger) {
      this._state.pickBonus = {
        ...generatePickBonus(result.pickedBonus).sample(rng),
        currentIndex: 0,
        winValue: result.pickedBonus,
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
    // Reset session-based state on new base spin
    this._state.freeSpins = {
      triggeringWager: wager,
      totalWin: 0,
      spinsRemaining: 0,
    }
    this._state.pickBonus = null

    return this.baseGameSpin(rng, wager)
  }

  next(rng: Rng): WoodlandWhisperResult | null {
    if (this._state.pickBonus) {
      return this.pickBall(rng)
    }

    if (this._state.freeSpins && this._state.freeSpins.spinsRemaining > 0) {
      return this.freeGameSpin(rng)
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
