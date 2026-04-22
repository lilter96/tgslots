import type { Rng } from '@tgslots/math/rng/types'

// ─── 1. Enhanced Types ─────────────────────────────────────────────────────

export type SpinType = 'BASE' | 'FREE' | 'RESPIN'

export interface SpinResult {
  type: SpinType
  win: number
  isTrigger: boolean
  isRetrigger?: boolean
  scatters?: number
  featureType?: string // NEW: 'PickBonus' | 'FreeSpin' | undefined (game sets this)
}

/** Raw counters for merging across workers */
export interface RawSimulationMetrics {
  totalSamples: number
  totalBet: number
  totalBaseWin: number
  totalFeatureWin: number
  baseHits: number
  triggers: number
  retriggers: number
  maxRoundWin: number
  distribution: Record<string, number>

  // Enhanced metrics
  totalWinJackpot: number // sum of roundWin for rounds where roundWin/bet >= 100
  freeSpinsPlayed: number // count of individual FREE/RESPIN spins
  featureCounts: Record<string, number> // featureType → trigger count (BASE isTrigger only)
  scatterDist: Record<string, number> // '0'..'5' → count of BASE spins with that scatter count
  sumSquaresRound: number // Σ(roundWin/bet)² — needed for variance calculation
}

/** Final calculated metrics for reporting */
export interface SimulationMetrics {
  totalSamples: number
  totalBet: number
  totalWin: number
  rtp: {
    total: number
    base: number
    feature: number
    withoutJackpots: number // (totalWin - totalWinJackpot) / totalBet
  }
  hitRates: {
    baseHitRate: number
    featureTriggerRate: number
  }
  features: {
    totalTriggers: number
    totalRetriggers: number
    averageFeatureWin: number
    freeSpinsPlayed: number
    featureCounts: Record<string, number>
    featureCycles: Record<string, number> // N / featureCounts[type]
  }
  scatter: {
    distribution: Record<string, number> // raw counts per scatter value
    frequencies: Record<string, number> // fraction of BASE spins
    cycle: number // N / triggers
  }
  variance: {
    mean: number // E[X] = totalWin/totalBet = total RTP (sanity check)
    variance: number // E[X²] - E[X]²  where X = roundWin/bet
    stdDev: number // √variance
  }
  maxWinObserved: number
  winDistribution: Record<string, number>
}

// ─── 2. Enhanced Data Collector ────────────────────────────────────────────

export interface DataCollector {
  beginRound(bet: number): void

  collect(result: SpinResult): void

  endRound(): void

  getRawMetrics(): RawSimulationMetrics
}

export class ModernDataCollector implements DataCollector {
  private betAmount = 0
  private samples = 0
  private totalBet = 0

  private totalBaseWin = 0
  private totalFeatureWin = 0

  private baseHits = 0
  private triggers = 0
  private retriggers = 0

  private maxRoundWin = 0

  private distribution: Record<string, number> = {
    '0x': 0,
    '<1x': 0,
    '1x-5x': 0,
    '5x-20x': 0,
    '20x-50x': 0,
    '50x-100x': 0,
    '>100x': 0,
  }

  private currentRoundWin = 0

  // Enhanced metrics
  private totalWinJackpot = 0
  private freeSpinsPlayed = 0
  private featureCounts: Record<string, number> = {}
  private scatterDist: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  private sumSquaresRound = 0

  beginRound(bet: number): void {
    this.betAmount = bet
    this.totalBet += bet
    this.currentRoundWin = 0
  }

  collect(result: SpinResult): void {
    this.currentRoundWin += result.win

    if (result.type === 'BASE') {
      this.samples++
      this.totalBaseWin += result.win
      if (result.win > 0) this.baseHits++

      const sc = Math.min(result.scatters ?? 0, 5)
      const key = String(sc)
      this.scatterDist[key] = (this.scatterDist[key] ?? 0) + 1

      if (result.isTrigger) {
        this.triggers++
        if (result.featureType) {
          this.featureCounts[result.featureType] = (this.featureCounts[result.featureType] || 0) + 1
        }
      }
    } else {
      this.totalFeatureWin += result.win
      this.freeSpinsPlayed++
      if (result.isRetrigger || result.isTrigger) this.retriggers++
    }
  }

  endRound(): void {
    if (this.currentRoundWin > this.maxRoundWin) {
      this.maxRoundWin = this.currentRoundWin
    }

    const mob = this.currentRoundWin / this.betAmount

    if (mob === 0) {
      this.distribution['0x'] = (this.distribution['0x'] ?? 0) + 1
    } else if (mob < 1) {
      this.distribution['<1x'] = (this.distribution['<1x'] ?? 0) + 1
    } else if (mob < 5) {
      this.distribution['1x-5x'] = (this.distribution['1x-5x'] ?? 0) + 1
    } else if (mob < 20) {
      this.distribution['5x-20x'] = (this.distribution['5x-20x'] ?? 0) + 1
    } else if (mob < 50) {
      this.distribution['20x-50x'] = (this.distribution['20x-50x'] ?? 0) + 1
    } else if (mob < 100) {
      this.distribution['50x-100x'] = (this.distribution['50x-100x'] ?? 0) + 1
    } else {
      this.distribution['>100x'] = (this.distribution['>100x'] ?? 0) + 1
    }

    this.sumSquaresRound += mob * mob
    if (mob >= 100) {
      this.totalWinJackpot += this.currentRoundWin
    }
  }

  getRawMetrics(): RawSimulationMetrics {
    return {
      totalSamples: this.samples,
      totalBet: this.totalBet,
      totalBaseWin: this.totalBaseWin,
      totalFeatureWin: this.totalFeatureWin,
      baseHits: this.baseHits,
      triggers: this.triggers,
      retriggers: this.retriggers,
      maxRoundWin: this.maxRoundWin,
      distribution: { ...this.distribution },
      totalWinJackpot: this.totalWinJackpot,
      freeSpinsPlayed: this.freeSpinsPlayed,
      featureCounts: { ...this.featureCounts },
      scatterDist: { ...this.scatterDist },
      sumSquaresRound: this.sumSquaresRound,
    }
  }
}

export const Metrics = {
  merge(a: RawSimulationMetrics, b: RawSimulationMetrics): RawSimulationMetrics {
    const dist: Record<string, number> = {}
    const distKeys = new Set([...Object.keys(a.distribution), ...Object.keys(b.distribution)])
    for (const k of distKeys) {
      dist[k] = (a.distribution[k] || 0) + (b.distribution[k] || 0)
    }

    const featCounts: Record<string, number> = {}
    const featKeys = new Set([
      ...Object.keys(a.featureCounts || {}),
      ...Object.keys(b.featureCounts || {}),
    ])
    for (const k of featKeys) {
      featCounts[k] = (a.featureCounts[k] || 0) + (b.featureCounts[k] || 0)
    }

    const scDist: Record<string, number> = {}
    const scKeys = new Set([
      ...Object.keys(a.scatterDist || {}),
      ...Object.keys(b.scatterDist || {}),
    ])
    for (const k of scKeys) {
      scDist[k] = (a.scatterDist[k] || 0) + (b.scatterDist[k] || 0)
    }

    return {
      totalSamples: a.totalSamples + b.totalSamples,
      totalBet: a.totalBet + b.totalBet,
      totalBaseWin: a.totalBaseWin + b.totalBaseWin,
      totalFeatureWin: a.totalFeatureWin + b.totalFeatureWin,
      baseHits: a.baseHits + b.baseHits,
      triggers: a.triggers + b.triggers,
      retriggers: a.retriggers + b.retriggers,
      maxRoundWin: Math.max(a.maxRoundWin, b.maxRoundWin),
      distribution: dist,
      totalWinJackpot: a.totalWinJackpot + b.totalWinJackpot,
      freeSpinsPlayed: a.freeSpinsPlayed + b.freeSpinsPlayed,
      featureCounts: featCounts,
      scatterDist: scDist,
      sumSquaresRound: a.sumSquaresRound + b.sumSquaresRound,
    }
  },

  emptyRaw(): RawSimulationMetrics {
    return {
      totalSamples: 0,
      totalBet: 0,
      totalBaseWin: 0,
      totalFeatureWin: 0,
      baseHits: 0,
      triggers: 0,
      retriggers: 0,
      maxRoundWin: 0,
      distribution: {
        '0x': 0,
        '<1x': 0,
        '1x-5x': 0,
        '5x-20x': 0,
        '20x-50x': 0,
        '50x-100x': 0,
        '>100x': 0,
      },
      totalWinJackpot: 0,
      freeSpinsPlayed: 0,
      featureCounts: {},
      scatterDist: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      sumSquaresRound: 0,
    }
  },

  finalize(raw: RawSimulationMetrics): SimulationMetrics {
    const totalWin = raw.totalBaseWin + raw.totalFeatureWin
    const mean = raw.totalBet > 0 ? totalWin / raw.totalBet : 0
    const eX2 = raw.totalSamples > 0 ? raw.sumSquaresRound / raw.totalSamples : 0
    const variance = eX2 - mean * mean

    const featCycles: Record<string, number> = {}
    for (const [type, count] of Object.entries(raw.featureCounts)) {
      featCycles[type] = count > 0 ? raw.totalSamples / count : 0
    }

    const scFreqs: Record<string, number> = {}
    for (const [sc, count] of Object.entries(raw.scatterDist)) {
      scFreqs[sc] = raw.totalSamples > 0 ? count / raw.totalSamples : 0
    }

    return {
      totalSamples: raw.totalSamples,
      totalBet: raw.totalBet,
      totalWin: totalWin,
      rtp: {
        total: mean,
        base: raw.totalBet > 0 ? raw.totalBaseWin / raw.totalBet : 0,
        feature: raw.totalBet > 0 ? raw.totalFeatureWin / raw.totalBet : 0,
        withoutJackpots: raw.totalBet > 0 ? (totalWin - raw.totalWinJackpot) / raw.totalBet : 0,
      },
      hitRates: {
        baseHitRate: raw.totalSamples > 0 ? raw.baseHits / raw.totalSamples : 0,
        featureTriggerRate: raw.totalSamples > 0 ? raw.triggers / raw.totalSamples : 0,
      },
      features: {
        totalTriggers: raw.triggers,
        totalRetriggers: raw.retriggers,
        averageFeatureWin: raw.triggers > 0 ? raw.totalFeatureWin / raw.triggers : 0,
        freeSpinsPlayed: raw.freeSpinsPlayed,
        featureCounts: raw.featureCounts,
        featureCycles: featCycles,
      },
      scatter: {
        distribution: raw.scatterDist,
        frequencies: scFreqs,
        cycle: raw.triggers > 0 ? raw.totalSamples / raw.triggers : 0,
      },
      variance: {
        mean: mean,
        variance: variance,
        stdDev: Math.sqrt(Math.max(0, variance)),
      },
      maxWinObserved: raw.maxRoundWin,
      winDistribution: raw.distribution,
    }
  },
}

export interface StateMachine<TResult extends SpinResult, TState = unknown> {
  readonly state: TState

  spin(rng: Rng): TResult

  next(rng: Rng): TResult | null
}

export function runCycle<TResult extends SpinResult>(
  sm: StateMachine<TResult>,
  rng: Rng,
  collector: DataCollector,
  betAmount: number,
): void {
  collector.beginRound(betAmount)

  collector.collect(sm.spin(rng))

  let nextResult: TResult | null
  while ((nextResult = sm.next(rng)) !== null) {
    collector.collect(nextResult)
  }

  collector.endRound()
}
