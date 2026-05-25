import type { Rng } from '@tgslots/math/rng/types'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '@tgslots/slots-simulation-engine'
import { Wager } from '@tgslots/slots-core/betting'
import {
  MIN_SCATTERS,
  FREE_SPIN_AWARDS,
  MAX_WIN_MULTIPLIER,
  BUY_OPTIONS,
  DEFAULT_MODE,
  type BuyOptionId,
  type ModeId,
} from './constants.js'
import {
  LE_MILITARE_SAMPLER,
  BUY_BONUS_SAMPLER,
  CHANCE_SPIN_SAMPLER,
  AIR_RAID_SPIN_SAMPLER,
} from './logic.js'
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
  // Cumulative win of the current round (base + free spins), used for the
  // max-win cap which ends the feature once the ceiling is reached.
  roundWin: number
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
  airRaid: LeMilitareSpinResult['airRaid']
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
  private readonly _mode: ModeId

  constructor(initialState?: LeMilitareState, mode: ModeId = DEFAULT_MODE) {
    this._mode = mode
    this._state = initialState ?? {
      lastGrid: null,
      freeSpins: null,
      lastSpinResult: null,
      roundWin: 0,
    }
  }

  get mode(): ModeId {
    return this._mode
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

  // Shared base-spin driver. `spin`, the ×5-chance spin and the guaranteed
  // Air-Raid spin differ only in which sampler they run.
  private _baseSpin(
    rng: Rng,
    wager: Wager,
    sampler: ReturnType<typeof LE_MILITARE_SAMPLER>,
  ): LeMilitareBaseResult {
    this._state.freeSpins = null
    this._state.lastSpinResult = null
    this._state.roundWin = 0

    const result = sampler.sample(rng)

    this._state.lastGrid = result.initialGrid
    this._state.lastSpinResult = result

    const cap = MAX_WIN_MULTIPLIER * wager.totalWager
    const win = Math.min(result.finalWin, cap)
    this._state.roundWin = win

    if (result.triggeredFreeSpins && win < cap) {
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
      win,
      components: { total: win },
      scatterCount: result.scatterCount,
      triggeredFreeSpins: result.triggeredFreeSpins,
      freeSpinsAwarded: result.freeSpinsAwarded,
      steps: result.steps,
      multiplierSum: result.multiplierSum,
      finalWin: win,
      airRaid: result.airRaid,
      state: this._freeSpinState(),
    }
  }

  spin(rng: Rng, wager: Wager): LeMilitareBaseResult {
    return this._baseSpin(
      rng,
      wager,
      LE_MILITARE_SAMPLER(this._mode, wager, {
        isFreeSpin: false,
        carryArmedReels: new Set(),
        carryMultiplierSum: 0,
      }),
    )
  }

  /** Buy: one base spin with 5× the Free Spins trigger chance. */
  buyChanceSpin(rng: Rng, wager: Wager): LeMilitareBaseResult {
    return this._baseSpin(rng, wager, CHANCE_SPIN_SAMPLER(this._mode, wager))
  }

  /** Buy: one base spin with a guaranteed Air Raid. */
  buyAirRaidSpin(rng: Rng, wager: Wager): LeMilitareBaseResult {
    return this._baseSpin(rng, wager, AIR_RAID_SPIN_SAMPLER(this._mode, wager))
  }

  freeGameSpin(rng: Rng): LeMilitareFreeResult {
    if (!this._state.freeSpins || this._state.freeSpins.spinsRemaining <= 0) {
      throw new Error('No free spins remaining')
    }

    this._state.freeSpins.spinsRemaining--
    const { triggeringWager, armedReels, multiplierSum } = this._state.freeSpins

    const sampler = LE_MILITARE_SAMPLER(this._mode, triggeringWager, {
      isFreeSpin: true,
      carryArmedReels: armedReels,
      carryMultiplierSum: multiplierSum,
    })
    const result = sampler.sample(rng)

    this._state.lastGrid = result.initialGrid
    this._state.lastSpinResult = result

    const cap = MAX_WIN_MULTIPLIER * triggeringWager.totalWager
    const budget = cap - this._state.roundWin
    const capReached = result.finalWin >= budget
    const win = capReached ? budget : result.finalWin
    this._state.roundWin += win
    this._state.freeSpins.totalWin += win

    // Update session-persistent state
    for (const reel of result.endArmedReels) {
      this._state.freeSpins.armedReels.add(reel)
    }
    this._state.freeSpins.multiplierSum = result.endMultiplierSum

    // Once the round hits the max-win ceiling the feature ends immediately;
    // no further spins or retriggers are awarded.
    let retriggered = false
    let addedSpins = 0
    if (capReached) {
      this._state.freeSpins.spinsRemaining = 0
    } else {
      retriggered = result.scatterCount >= MIN_SCATTERS
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
    }

    return {
      type: 'FREE',
      win,
      components: { total: win },
      scatterCount: result.scatterCount,
      retriggered,
      freeSpinsAwarded: addedSpins,
      steps: result.steps,
      multiplierSum: result.multiplierSum,
      finalWin: win,
      state: this._freeSpinState(),
    }
  }

  buyBonus(rng: Rng, wager: Wager, option: BuyOptionId = 'standard'): LeMilitareBuyResult {
    this._state.freeSpins = null
    this._state.lastSpinResult = null
    this._state.roundWin = 0

    const tier = BUY_OPTIONS[option]
    const result = BUY_BONUS_SAMPLER(this._mode, wager, tier.minScatters).sample(rng)

    this._state.lastGrid = result.initialGrid
    this._state.lastSpinResult = result

    const cap = MAX_WIN_MULTIPLIER * wager.totalWager
    const win = Math.min(result.finalWin, cap)
    this._state.roundWin = win

    // Launcher reels (0,2,4) are the S300 reels armed at the start of the session.
    const armedReels = new Set<number>()
    for (let i = 0; i < tier.startArmedReels; i++) armedReels.add(i * 2)

    // The purchased tier fixes the spin count (cascade-accumulated scatters on
    // the forced entry must not inflate it beyond what was paid for).
    const awardedSpins = FREE_SPIN_AWARDS[tier.minScatters] ?? result.freeSpinsAwarded

    this._state.freeSpins = {
      triggeringWager: wager,
      spinsRemaining: win < cap ? awardedSpins : 0,
      totalWin: 0,
      armedReels,
      multiplierSum: tier.startMultiplier,
    }

    return {
      type: 'BUY',
      win,
      components: { total: win },
      scatterCount: result.scatterCount,
      triggeredFreeSpins: true,
      freeSpinsAwarded: awardedSpins,
      steps: result.steps,
      multiplierSum: result.multiplierSum,
      finalWin: win,
      state: this._freeSpinState(),
    }
  }

  next(rng: Rng): LeMilitareResult | null {
    if (this._state.freeSpins && this._state.freeSpins.spinsRemaining > 0) {
      return this.freeGameSpin(rng)
    }
    return null
  }

  recordResultMetrics(
    collector: DataCollector,
    result: LeMilitareResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const baseScope = collector.scope('base-game')
    const freeScope = collector.scope(['features', 'free-spins'])
    const combatScope = collector.scope(['features', 'combat-operation'])

    if (result.type === 'BASE') {
      if (result.win > 0) baseScope.count('hits')
      baseScope.distribution('scatter-count', String(result.scatterCount))
      if (result.triggeredFreeSpins) {
        freeScope.count('triggers')
        freeScope.value('spins-awarded', result.freeSpinsAwarded)
      }
      if (result.multiplierSum > 0) {
        combatScope.count('activations')
        combatScope.distribution(
          'multiplier-sum-per-spin',
          String(Math.round(result.multiplierSum)),
        )
      }
      return
    }

    if (result.type === 'BUY') {
      const buyScope = collector.scope(['features', 'buy-bonus'])
      buyScope.count('purchases')
      buyScope.value('spins-awarded', result.freeSpinsAwarded)
      return
    }

    if (result.type === 'FREE') {
      freeScope.count('spins-played')
      freeScope.payout('spin-win', result.win)
      freeScope.distribution('scatter-count', String(result.scatterCount))
      if (result.win > 0) freeScope.count('hits')
      if (result.retriggered) {
        freeScope.count('retriggers')
        freeScope.value('spins-awarded', result.freeSpinsAwarded)
      }
      if (result.multiplierSum > 0) {
        combatScope.count('free-activations')
        combatScope.distribution(
          'multiplier-sum-per-free-spin',
          String(Math.round(result.multiplierSum)),
        )
      }
    }
  }

  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot, _wager: Wager): void {
    const baseScope = collector.scope('base-game')
    const freeScope = collector.scope(['features', 'free-spins'])

    const baseWins = round.winsByType['BASE']
    const freeWins = round.winsByType['FREE']

    const baseTotalWin = baseWins?.total ?? 0
    const freeTotalWin = freeWins?.total ?? 0
    const freeCount = round.countsByType['FREE'] ?? 0

    baseScope.rtp('win', baseTotalWin)
    freeScope.rtp('feature-rtp', freeTotalWin)

    if (freeCount > 0) {
      freeScope.payout('session-win', freeTotalWin)
      freeScope.payout('triggered-round-win', round.totalWin)
      freeScope.value('total-spins-per-trigger', freeCount)
    }
  }
}
