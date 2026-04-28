import type { Rng } from '@tgslots/math/rng/types'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
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
}

export interface AncientDragonFreeResult extends SpinResult {
  type: 'FREE'
  sc: number
  retriggeredFreeSpins: boolean
}

export type AncientDragonResult = AncientDragonBaseResult | AncientDragonFreeResult

export class AncientDragonStateMachine implements StateMachine<
  AncientDragonResult,
  AncientDragonState
> {
  private _state: AncientDragonState = {
    freeSpins: null,
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

  recordResultMetrics(
    collector: DataCollector,
    result: AncientDragonResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])

    if (result.type === 'BASE') {
      baseScope.distribution('scatter-count', String(result.sc))
      baseScope.payout('spin-win', result.win)
      if (result.win > 0) baseScope.count('hits')
      if (result.triggeredFreeSpins) {
        freeSpinScope.count('triggers')
        freeSpinScope.value('spins-awarded', 10)
      }
      return
    }

    freeSpinScope.count('spins-played')
    freeSpinScope.payout('spin-win', result.win)
    freeSpinScope.distribution('scatter-count', String(result.sc))
    if (result.win > 0) freeSpinScope.count('hits')
    if (result.retriggeredFreeSpins) {
      freeSpinScope.count('retriggers')
      freeSpinScope.value('spins-awarded', 10)
    }
  }

  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot, _wager: Wager): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])

    const baseWin = round.winsByType.BASE?.total ?? 0
    const freeWin = round.winsByType.FREE?.total ?? 0

    // BASE GAME RTP — wager-normalized contribution to total RTP
    baseScope.rtp('win', baseWin)

    // FREE SPIN RTP — wager-normalized contribution, recorded every round
    freeSpinScope.rtp('feature-rtp', freeWin)

    const hasFreeSpins = (round.countsByType.FREE ?? 0) > 0
    if (!hasFreeSpins) return

    freeSpinScope.payout('session-win', freeWin)
    freeSpinScope.payout('triggered-round-win', round.totalWin)
    freeSpinScope.value('total-spins-per-trigger', round.countsByType.FREE ?? 0)
  }
}
