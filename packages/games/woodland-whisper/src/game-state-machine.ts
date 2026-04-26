import type { Rng } from '@tgslots/math/rng/types'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { FREE_SPIN_MULTIPLIER } from './constants.js'
import { WOODLAND_WHISPER_SAMPLER } from './logic.js'

export interface WoodlandWhisperState {
  freeSpinsLeft: number
  lastWager: Wager | null
}

export interface WoodlandWhisperResult extends SpinResult {
  sc: number
  pickedBonus: number
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

    const sampler = WOODLAND_WHISPER_SAMPLER(wager, false)
    const result = sampler.sample(rng)

    const isTrigger = result.sc >= 3
    this.roundTriggeredFeature = isTrigger
    if (isTrigger) {
      this._state.freeSpinsLeft += result.pickedBonus
    }

    return {
      ...result,
      type: 'BASE',
      isTrigger,
      featureType: isTrigger ? 'PickBonus' : undefined,
      scatters: result.sc,
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

    // Free spin wins are multiplied by 2
    const win = result.win * FREE_SPIN_MULTIPLIER
    const isTrigger = result.sc >= 3

    if (isTrigger) {
      this._state.freeSpinsLeft += result.pickedBonus
    }

    return {
      ...result,
      win,
      type: 'FREE',
      isTrigger: false,
      isRetrigger: isTrigger,
      scatters: result.sc,
      sc: result.sc,
    }
  }

  recordResultMetrics(
    collector: DataCollector,
    result: WoodlandWhisperResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])
    const pickBonusScope = freeSpinScope.scope('pick-bonus')

    if (result.type === 'BASE') {
      baseScope.distribution('scatter-count', String(result.sc))
      if (result.win > 0) baseScope.count('hits')

      if (result.isTrigger) {
        freeSpinScope.count('triggers')
        freeSpinScope.value('awarded-spins', result.pickedBonus)
        pickBonusScope.count('triggers')
        pickBonusScope.value('awarded-spins', result.pickedBonus)
      }
      return
    }

    freeSpinScope.count('spins')
    freeSpinScope.payout('spin-win', result.win)
    freeSpinScope.distribution('scatter-count', String(result.sc))
    if (result.win > 0) freeSpinScope.count('hits')

    pickBonusScope.count('spins')
    pickBonusScope.payout('spin-win', result.win)
    pickBonusScope.distribution('scatter-count', String(result.sc))
    if (result.win > 0) pickBonusScope.count('hits')

    if (result.isRetrigger) {
      freeSpinScope.count('retriggers')
      freeSpinScope.value('awarded-spins', result.pickedBonus)
      pickBonusScope.count('retriggers')
      pickBonusScope.value('awarded-spins', result.pickedBonus)
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
    const pickBonusScope = freeSpinScope.scope('pick-bonus')

    freeSpinScope.payout('bonus-payout', round.winsByType.FREE ?? 0, round.bet)
    freeSpinScope.payout('round-payout', round.totalWin, round.bet)

    pickBonusScope.payout('bonus-payout', round.winsByType.FREE ?? 0, round.bet)
    pickBonusScope.payout('round-payout', round.totalWin, round.bet)

    this.roundTriggeredFeature = false
  }
}
