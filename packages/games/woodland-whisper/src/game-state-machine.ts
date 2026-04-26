import type { Rng } from '@tgslots/math/rng/types'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { WOODLAND_WHISPER_SAMPLER } from './logic.js'

export interface WoodlandWhisperState {
  freeSpinsLeft: number
  lastWager: Wager | null
}

export interface WoodlandWhisperResult extends SpinResult {
  sc: number
  pickedBonus: number
  triggeredPickBonus: boolean
  retriggeredPickBonus?: boolean
}

export class WoodlandWhisperStateMachine implements StateMachine<
  WoodlandWhisperResult,
  WoodlandWhisperState
> {
  private roundTriggeredFeature = false
  private _state: WoodlandWhisperState = {
    freeSpinsLeft: 0,
    lastWager: null,
  }

  get state(): WoodlandWhisperState {
    return this._state
  }

  setWager(breakdown: Wager): void {
    this._state.lastWager = breakdown
  }

  spin(rng: Rng, wager: Wager): WoodlandWhisperResult {
    this._state.lastWager = wager

    const isFreeSpin = this._state.freeSpinsLeft > 0

    const sampler = WOODLAND_WHISPER_SAMPLER(wager, isFreeSpin)
    const result = sampler.sample(rng)

    const isTrigger = result.sc >= 3
    this.roundTriggeredFeature = isTrigger
    if (isTrigger) {
      this._state.freeSpinsLeft += result.pickedBonus
    }

    return {
      ...result,
      type: 'BASE',
      triggeredPickBonus: isTrigger,
      sc: result.sc,
    }
  }

  next(rng: Rng): WoodlandWhisperResult | null {
    if (this._state.freeSpinsLeft <= 0 || !this._state.lastWager) {
      return null
    }

    this._state.freeSpinsLeft--
    const sampler = WOODLAND_WHISPER_SAMPLER(this._state.lastWager, true)
    const result = sampler.sample(rng)

    const win = result.win
    const isTrigger = result.sc >= 3

    if (isTrigger) {
      this._state.freeSpinsLeft += result.pickedBonus
    }

    return {
      ...result,
      win,
      type: 'FREE',
      triggeredPickBonus: false,
      retriggeredPickBonus: isTrigger,
      sc: result.sc,
    }
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
      baseScope.distribution('scatter-count', String(result.sc))
      if (result.win > 0) baseScope.count('winning-spins')

      if (result.triggeredPickBonus) {
        freeSpinScope.count('triggers')
        freeSpinScope.value('spins-awarded', result.pickedBonus)
        pickBonusBaseScope.count('triggers')
        pickBonusBaseScope.value('spins-awarded', result.pickedBonus)
      }
      return
    }

    freeSpinScope.count('spins-played')
    freeSpinScope.payout('spin-win', result.win)
    freeSpinScope.distribution('scatter-count', String(result.sc))
    if (result.win > 0) freeSpinScope.count('winning-spins')

    if (result.retriggeredPickBonus) {
      freeSpinScope.count('retriggers')
      freeSpinScope.value('spins-awarded', result.pickedBonus)
      pickBonusFreeScope.count('retriggers')
      pickBonusFreeScope.value('spins-awarded', result.pickedBonus)
    }
  }

  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot, _wager: Wager): void {
    const freeSpinScope = collector.scope(['features', 'free-spins'])

    // Record on every round so ratio = feature_wins / total_bets = feature RTP
    freeSpinScope.payout('feature-rtp', round.winsByType.FREE ?? 0, round.bet)

    const hadFeature = this.roundTriggeredFeature || (round.countsByType.FREE ?? 0) > 0
    this.roundTriggeredFeature = false
    if (!hadFeature) return

    freeSpinScope.payout('feature-win', round.winsByType.FREE ?? 0, round.bet)
    freeSpinScope.payout('round-win', round.totalWin, round.bet)
    freeSpinScope.value('total-spins-per-trigger', round.countsByType.FREE ?? 0)
  }
}
