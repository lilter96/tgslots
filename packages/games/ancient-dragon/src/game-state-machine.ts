import type { Rng } from '@tgslots/math/rng/types'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '@tgslots/slots-simulation-engine'
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
  private roundTriggeredFeature = false
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
    this.roundTriggeredFeature = isTrigger
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

  recordResultMetrics(
    collector: DataCollector,
    result: AncientDragonResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])

    if (result.type === 'BASE') {
      baseScope.distribution('scatter-count', String(result.sc))
      if (result.win > 0) baseScope.count('hits')
      if (result.isTrigger) {
        freeSpinScope.count('triggers')
        freeSpinScope.value('awarded-spins', 10)
      }
      return
    }

    freeSpinScope.count('spins')
    freeSpinScope.payout('spin-win', result.win)
    freeSpinScope.distribution('scatter-count', String(result.sc))
    if (result.win > 0) freeSpinScope.count('hits')
    if (result.isRetrigger) {
      freeSpinScope.count('retriggers')
      freeSpinScope.value('awarded-spins', 10)
    }
  }

  recordRoundMetrics(
    collector: DataCollector,
    round: RoundMetricsSnapshot,
    _wager: Wager,
  ): void {
    if (!this.roundTriggeredFeature && (round.countsByType.FREE ?? 0) === 0) {
      return
    }

    const freeSpinScope = collector.scope(['features', 'free-spins'])
    freeSpinScope.payout('bonus-payout', round.winsByType.FREE ?? 0, round.bet)
    freeSpinScope.payout('round-payout', round.totalWin, round.bet)
    this.roundTriggeredFeature = false
  }
}
