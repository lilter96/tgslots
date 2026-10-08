import type { Rng } from '@tgslots/math/rng/types'
import type { Wager } from '@tgslots/slots-core/betting'
import type { DataCollector, StateMachine } from '@tgslots/slots-simulation-engine'
import { BaseScatterEngine, collectCashPrizes } from '@tgslots/slots-core'
import { config, COLUMNS, ROWS } from './constants'
import { BASE_GRID, BONUS_GRID, PRIZES, project, sampleCascades } from './samplers'
import type { LivesResult, LivesState } from './types'
const scatter = new BaseScatterEngine({ symbolId: 7, payouts: [] })
const columns = (symbols: readonly number[]) =>
  Array.from({ length: COLUMNS }, (_, reel) => symbols.slice(reel * ROWS, (reel + 1) * ROWS))
export function initialState(): LivesState {
  return {
    phase: 'BASE',
    triggeringMultiplier: 1,
    remaining: 0,
    multiplier: 1,
    roundWin: 0,
    bonusWin: 0,
    lastGrid: Array.from({ length: COLUMNS }, (_, reel) =>
      Array.from({ length: ROWS }, (_, row) => 1 + ((reel * 2 + row) % 5)),
    ),
  }
}
export class NineLivesMachine implements StateMachine<LivesResult, LivesState> {
  state: LivesState
  constructor(state?: LivesState) {
    this.state = structuredClone(state ?? initialState())
  }
  spin(rng: Rng, wager: Wager): LivesResult {
    if (this.state.phase !== 'BASE') throw new Error('Finish the nine lives first')
    this.state.triggeringMultiplier = wager.multiplier
    this.state.roundWin = 0
    this.state.bonusWin = 0
    this.state.multiplier = 1
    const symbols = BASE_GRID.sample(rng)
    const cascade = sampleCascades(symbols).sample(rng)
    return this.resolve(symbols, cascade, [], 'BASE')
  }
  buyBonus(wager: Wager): LivesResult {
    if (this.state.phase !== 'BASE') throw new Error('Finish the nine lives first')
    this.state = {
      ...initialState(),
      triggeringMultiplier: wager.multiplier,
      phase: 'FREE',
      remaining: config.freeSpins,
    }
    const symbols = this.state.lastGrid.flat()
    for (const position of [0, 9, 20, 29]) symbols[position] = 7
    this.state.lastGrid = columns(symbols)
    return {
      type: 'BUY',
      win: 0,
      grid: columns(symbols),
      finalGrid: columns(symbols),
      steps: [],
      coins: [],
      collectionWin: 0,
      clusterWin: 0,
      scatters: 4,
      bonusTriggered: true,
      bonusEnded: false,
      remaining: config.freeSpins,
      multiplier: 1,
      roundWin: 0,
      capped: false,
    }
  }
  next(rng: Rng): LivesResult | null {
    if (this.state.phase !== 'FREE') return null
    this.state.remaining--
    const symbols = BONUS_GRID.sample(rng)
    const prizes = PRIZES.sample(rng)
    const coins = symbols.flatMap((id, position) =>
      id === 6
        ? [
            {
              position,
              value: prizes[position]! * config.baseCost * this.state.triggeringMultiplier,
            },
          ]
        : [],
    )
    // The Reaper collects every initial chip once, then leaves a consumable WILD.
    const transformed = symbols.map((id) => (id === 6 ? 0 : id))
    const cascade = sampleCascades(transformed).sample(rng)
    return this.resolve(symbols, cascade, coins, 'FREE')
  }
  private resolve(
    symbols: number[],
    cascade: ReturnType<ReturnType<typeof sampleCascades>['sample']>,
    coins: LivesResult['coins'],
    type: 'BASE' | 'FREE',
  ): LivesResult {
    const beforeMultiplier = this.state.multiplier
    const rawCollection = collectCashPrizes(coins, beforeMultiplier)
    const collectionWin = this.award(rawCollection)
    const steps = cascade.steps
      .filter((step) => step.evaluation.hits.length > 0)
      .map((step, index) => {
        const multiplier = Math.min(config.maxMultiplier, beforeMultiplier + index)
        return {
          before: step.before!,
          after: step.after!,
          hits: step.evaluation.hits,
          vanished: step.vanished,
          multiplier,
          win: this.award(step.stepWin * this.state.triggeringMultiplier * multiplier),
        }
      })
    const clusterWin = steps.reduce((sum, step) => sum + step.win, 0)
    const win = collectionWin + clusterWin
    const scatters = scatter.evaluate(project(symbols), 0).count
    const triggered = type === 'BASE' && scatters >= 4 && !this.atCap()
    this.state.lastGrid = Array.from({ length: COLUMNS }, (_, reel) =>
      Array.from({ length: ROWS }, (_, row) => cascade.finalGrid.getSymbol(reel, row)),
    )
    if (type === 'FREE') {
      this.state.bonusWin += win
      this.state.multiplier = Math.min(config.maxMultiplier, beforeMultiplier + steps.length)
    } else if (triggered) {
      this.state.phase = 'FREE'
      this.state.remaining = config.freeSpins
      this.state.multiplier = 1
    }
    const ended = type === 'FREE' && (this.state.remaining === 0 || this.atCap())
    if (ended) {
      this.state.phase = 'BASE'
      this.state.remaining = 0
    }
    return {
      type,
      win,
      grid: columns(symbols),
      finalGrid: structuredClone(this.state.lastGrid),
      steps,
      coins,
      collectionWin,
      clusterWin,
      scatters,
      bonusTriggered: triggered,
      bonusEnded: ended,
      remaining: this.state.remaining,
      multiplier: this.state.multiplier,
      roundWin: this.state.roundWin,
      capped: this.atCap(),
    }
  }
  private atCap(): boolean {
    return this.state.roundWin >= config.maxWinX * config.baseCost * this.state.triggeringMultiplier
  }
  private award(amount: number): number {
    const awarded = Math.min(
      amount,
      config.maxWinX * config.baseCost * this.state.triggeringMultiplier - this.state.roundWin,
    )
    this.state.roundWin += awarded
    return awarded
  }
  recordResultMetrics(collector: DataCollector, result: LivesResult): void {
    const scope = collector.scope(result.type === 'BASE' ? 'base-game' : 'features/free-spins')
    scope.count('spins-played')
    scope.rtp('win', result.win)
    scope.payout('spin-win', result.win)
    if (result.bonusTriggered) collector.scope('features/free-spins').count('triggers')
    const cascades = collector.scope('features/cascades')
    cascades.count('steps', result.steps.length)
    cascades.rtp('win', result.clusterWin)
    collector.scope('features/reaper-collector').rtp('win', result.collectionWin)
  }
}
