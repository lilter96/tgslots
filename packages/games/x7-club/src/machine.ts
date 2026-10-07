import type { Rng } from '@tgslots/math/rng/types'
import type { Wager } from '@tgslots/slots-core/betting'
import type { DataCollector, StateMachine } from '@tgslots/slots-simulation-engine'
import { evaluateSpin } from '@tgslots/slots-core/paylines/evaluator'
import { ProjectedGrid } from '@tgslots/slots-core/spin-grid/spin-grid'
import {
  enterHoldSpin,
  advanceHoldSpin,
  isHoldSpinComplete,
  collectHeldPrizes,
  queueColumnBoosts,
  advanceColumnBoost,
} from '@tgslots/slots-core/hold-spin/hold-spin'
import { BASE_SAMPLE, HOLD_SAMPLE, BOOST_SAMPLE } from './samplers'
import { config, HOLD_RULES } from './constants'
import { engine } from './engine'
import type { ClubCoin, ClubResult, ClubState } from './types'

const POSITIONS = [0, 0, 0, 0, 0]
export function initialState(): ClubState {
  return {
    phase: 'BASE',
    triggeringMultiplier: 1,
    roundWin: 0,
    bonus: null,
    lastGrid: Array.from({ length: 5 }, () => [0, 1, 2]),
  }
}
export class X7ClubMachine implements StateMachine<ClubResult, ClubState> {
  state: ClubState
  constructor(state?: ClubState) {
    this.state = structuredClone(state ?? initialState())
  }
  spin(rng: Rng, wager: Wager): ClubResult {
    if (this.state.phase !== 'BASE') throw new Error('Finish the active bonus first')
    this.state.triggeringMultiplier = wager.multiplier
    this.state.roundWin = 0
    const { symbols, prizes } = BASE_SAMPLE.sample(rng)
    const grid = Array.from({ length: 5 }, (_, reel) => symbols.slice(reel * 3, reel * 3 + 3))
    this.state.lastGrid = grid
    const projected = new ProjectedGrid(
      grid.map((column) => new Uint8Array(column)),
      POSITIONS,
      3,
    )
    const evaluation = evaluateSpin(projected, engine)
    const coins: ClubCoin[] = symbols.flatMap((id, position) =>
      id === 6
        ? [
            {
              position,
              value: prizes[position]!.value * wager.totalWager,
              tier: prizes[position]!.tier,
            },
          ]
        : [],
    )
    if (coins.length >= 6) this.enterBonus(coins)
    return this.result(
      'BASE',
      this.award(evaluation.totalWin * wager.creditsPerLine),
      coins,
      evaluation.hits,
      coins.length >= 6,
    )
  }
  buyBonus(wager: Wager): ClubResult {
    if (this.state.phase !== 'BASE') throw new Error('Finish the active bonus first')
    this.state.triggeringMultiplier = wager.multiplier
    this.state.roundWin = 0
    const coins: ClubCoin[] = [0, 2, 4, 6, 10, 14].map((position) => ({
      position,
      value: wager.multiplier * config.buyEntryCredits,
      tier: 'CREDIT',
    }))
    this.state.lastGrid = Array.from({ length: 5 }, (_, reel) =>
      Array.from({ length: 3 }, (_, row) =>
        coins.some((c) => c.position === reel * 3 + row) ? 6 : 0,
      ),
    )
    this.enterBonus(coins)
    return this.result('BUY', 0, coins, [], true)
  }
  next(rng: Rng): ClubResult | null {
    const bonus = this.state.bonus
    if (!bonus) return null
    if (this.state.phase === 'BOOST') {
      const kind = BOOST_SAMPLE.sample(rng)
      const stake = config.baseCost * this.state.triggeringMultiplier
      const advanced = advanceColumnBoost(
        bonus,
        HOLD_RULES,
        {
          mode: kind === 'STOP' ? 'bank' : kind === 'X7' ? 'multiply' : 'add',
          amount: kind === 'X7' ? 7 : kind === 'PLUS2' ? stake * 2 : kind === 'PLUS1' ? stake : 0,
          finish: kind === 'X7',
        },
        7,
      )
      this.state.bonus = advanced.state
      this.state.phase = advanced.state.pendingColumns.length ? 'BOOST' : 'HOLD'
      const result = this.finishIfNeeded([])
      result.boost = { column: advanced.column, kind, finished: advanced.finished }
      return result
    }
    const draws = HOLD_SAMPLE.sample(rng)
    const occupied = new Set(bonus.coins.map((coin) => coin.position))
    const newCoins: ClubCoin[] = draws.flatMap(({ hit, prize }, position) =>
      hit && !occupied.has(position)
        ? [
            {
              position,
              value: prize.value * config.baseCost * this.state.triggeringMultiplier,
              tier: prize.tier,
            },
          ]
        : [],
    )
    // A complete imported board may still have column awards waiting to be queued.
    if (!isHoldSpinComplete(bonus, HOLD_RULES))
      Object.assign(bonus, advanceHoldSpin(bonus, newCoins, HOLD_RULES))
    this.queueColumns()
    return this.finishIfNeeded(newCoins)
  }
  private enterBonus(coins: ClubCoin[]): void {
    this.state.bonus = {
      ...enterHoldSpin(coins, HOLD_RULES),
      boostedColumns: [],
      pendingColumns: [],
      boostPulls: 0,
    }
    this.state.phase = 'HOLD'
    this.queueColumns()
  }
  private queueColumns(): void {
    this.state.bonus = queueColumnBoosts(this.state.bonus!, HOLD_RULES)
    if (this.state.bonus.pendingColumns.length) this.state.phase = 'BOOST'
  }
  private finishIfNeeded(newCoins: ClubCoin[]): ClubResult {
    const bonus = this.state.bonus!
    const ended = !bonus.pendingColumns.length && isHoldSpinComplete(bonus, HOLD_RULES)
    const amount = collectHeldPrizes(bonus)
    const result = this.result('RESPIN', ended ? this.award(amount) : 0, newCoins)
    result.bonusEnded = ended
    result.bonusTotal = amount
    if (ended) {
      this.state.bonus = null
      this.state.phase = 'BASE'
    }
    return result
  }
  private award(amount: number): number {
    const remaining =
      config.maxWinX * config.baseCost * this.state.triggeringMultiplier - this.state.roundWin
    const award = Math.min(amount, remaining)
    this.state.roundWin += award
    return award
  }
  private result(
    type: ClubResult['type'],
    win: number,
    newCoins: ClubCoin[],
    hits: ClubResult['hits'] = [],
    bonusTriggered = false,
  ): ClubResult {
    const coins = structuredClone(this.state.bonus?.coins ?? newCoins)
    return {
      type,
      win,
      grid: structuredClone(this.state.lastGrid),
      hits,
      coins,
      newCoins: structuredClone(newCoins),
      respins: this.state.bonus?.respins ?? 0,
      bonusTriggered,
      bonusEnded: false,
      bonusTotal: coins.reduce((sum, c) => sum + c.value, 0),
      capped:
        this.state.roundWin === config.maxWinX * config.baseCost * this.state.triggeringMultiplier,
    }
  }
  recordResultMetrics(collector: DataCollector, result: ClubResult): void {
    const scope = collector.scope(result.type === 'BASE' ? 'base-game' : 'features/hold-spin')
    scope.count('spins-played')
    scope.payout('spin-win', result.win)
    scope.rtp('win', result.win)
    if (result.bonusTriggered) scope.count('triggers')
    if (result.boost) collector.scope('features/column-boost').count(result.boost.kind)
  }
}
