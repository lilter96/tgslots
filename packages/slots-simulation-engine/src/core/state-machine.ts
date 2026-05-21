import type { Rng } from '@tgslots/math/rng/types'
import { Wager } from '@tgslots/slots-core/betting'

export type SpinType = 'BASE' | 'FREE' | 'RESPIN' | 'PICK' | 'BUY'
export type MetricScopePath = readonly string[]

export interface WinComponents {
  total?: number
  scatter?: number
  lines?: number
}

export interface SpinResult {
  type: SpinType
  win: number
  components?: WinComponents
}

export interface RawCountMetric {
  kind: 'count'
  total: number
}

export interface RawValueMetric {
  kind: 'value'
  count: number
  sum: number
  min: number | null
  max: number | null
}

export interface RawDistributionMetric {
  kind: 'distribution'
  total: number
  buckets: Record<string, number>
}

export interface RawPayoutMetric {
  kind: 'payout'
  count: number
  total: number
  min: number | null
  max: number | null
}

export interface RawRtpMetric {
  kind: 'rtp'
  count: number
  total: number
}

export type RawScopedMetric =
  | RawCountMetric
  | RawValueMetric
  | RawDistributionMetric
  | RawPayoutMetric
  | RawRtpMetric

export interface RawMetricScope {
  metrics: Record<string, RawScopedMetric>
  scopes: Record<string, RawMetricScope>
}

export interface RawSimulationMetrics {
  rounds: number
  totalBet: number
  totalWin: number
  totalSpinResults: number
  maxRoundWin: number
  maxRoundWinMultiplier: number
  sumRoundWinMultiplier: number
  sumSquaresRoundWinMultiplier: number
  rootScope: RawMetricScope
}

export interface FinalCountMetric {
  kind: 'count'
  total: number
  rate: number
  cycle: number | null
}

export interface FinalValueMetric {
  kind: 'value'
  count: number
  sum: number
  average: number
  min: number | null
  max: number | null
}

export interface FinalDistributionBucket {
  count: number
  ratio: number
}

export interface FinalDistributionMetric {
  kind: 'distribution'
  total: number
  buckets: Record<string, FinalDistributionBucket>
}

export interface FinalPayoutMetric {
  kind: 'payout'
  count: number
  total: number
  average: number
  min: number | null
  max: number | null
}

export interface FinalRtpMetric {
  kind: 'rtp'
  count: number
  total: number
  ratio: number | null
}

export type FinalScopedMetric =
  | FinalCountMetric
  | FinalValueMetric
  | FinalDistributionMetric
  | FinalPayoutMetric
  | FinalRtpMetric

export interface FinalMetricScope {
  path: string[]
  metrics: Record<string, FinalScopedMetric>
  scopes: Record<string, FinalMetricScope>
}

export interface SimulationSummary {
  rounds: number
  totalBet: number
  totalWin: number
  averageBet: number
  averageRoundWin: number
  totalSpinResults: number
  rtp: number
  maxRoundWin: number
  maxRoundWinMultiplier: number
  variance: {
    mean: number
    variance: number
    stdDev: number
  }
  roundWinDistribution: FinalDistributionMetric
  resultTypeDistribution: FinalDistributionMetric
}

export interface SimulationMetrics {
  schemaVersion: 2
  summary: SimulationSummary
  scopes: FinalMetricScope
}

export interface RoundMetricsSnapshot {
  bet: number
  totalWin: number
  resultCount: number
  maxResultWin: number
  countsByType: Partial<Record<SpinType, number>>
  winsByType: Partial<Record<SpinType, WinComponents>>
}

export interface ScopedMetrics {
  scope(path: string | MetricScopePath): ScopedMetrics

  count(name: string, amount?: number): void

  value(name: string, observed: number): void

  distribution(name: string, bucket: string, amount?: number): void

  /**
   * Aggregate-style payout metric: tracks count, total, average, min, max of a
   * payout-bearing event. Use for "average win when X fires" stats. No
   * denominator — never an RTP. For wager-normalized RTP, use `rtp(...)`.
   */
  payout(name: string, amount: number): void

  /**
   * Wager-normalized return contribution: at finalize time the total is divided
   * by the simulation's cumulative `totalBet`. Recording cadence does not matter
   * — each call only contributes to the numerator. The sum of partitioning rtp
   * metrics equals `summary.rtp`.
   */
  rtp(name: string, amount: number): void
}

export interface DataCollector extends ScopedMetrics {
  beginRound(bet: number): void

  collect(result: SpinResult): void

  endRound(): void

  getRawMetrics(): RawSimulationMetrics

  getLastRoundSnapshot(): RoundMetricsSnapshot | null
}

const DEFAULT_WIN_BUCKETS = [
  '0x',
  '<1x',
  '1x-5x',
  '5x-20x',
  '20x-50x',
  '50x-100x',
  '>100x',
] as const

function normalizeScopePath(path: string | MetricScopePath): string[] {
  if (typeof path === 'string') {
    return path
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
  }
  return [...path]
}

function emptyScope(): RawMetricScope {
  return { metrics: {}, scopes: {} }
}

function bucketRoundWin(multiplier: number): (typeof DEFAULT_WIN_BUCKETS)[number] {
  if (multiplier === 0) return '0x'
  if (multiplier < 1) return '<1x'
  if (multiplier < 5) return '1x-5x'
  if (multiplier < 20) return '5x-20x'
  if (multiplier < 50) return '20x-50x'
  if (multiplier < 100) return '50x-100x'
  return '>100x'
}

function cloneScope(scope: RawMetricScope): RawMetricScope {
  return {
    metrics: Object.fromEntries(
      Object.entries(scope.metrics).map(([name, metric]) => [name, structuredClone(metric)]),
    ),
    scopes: Object.fromEntries(
      Object.entries(scope.scopes).map(([name, child]) => [name, cloneScope(child)]),
    ),
  }
}

function mergeScopedMetric(a: RawScopedMetric, b: RawScopedMetric): RawScopedMetric {
  if (a.kind !== b.kind) {
    throw new Error(`Cannot merge scoped metrics of different kinds: ${a.kind} vs ${b.kind}`)
  }

  switch (a.kind) {
    case 'count': {
      const right = b as RawCountMetric
      return { kind: 'count', total: a.total + right.total }
    }
    case 'value': {
      const right = b as RawValueMetric
      return {
        kind: 'value',
        count: a.count + right.count,
        sum: a.sum + right.sum,
        min: a.min === null ? right.min : right.min === null ? a.min : Math.min(a.min, right.min),
        max: a.max === null ? right.max : right.max === null ? a.max : Math.max(a.max, right.max),
      }
    }
    case 'distribution': {
      const right = b as RawDistributionMetric
      const buckets: Record<string, number> = {}
      const keys = new Set([...Object.keys(a.buckets), ...Object.keys(right.buckets)])
      for (const key of keys) {
        buckets[key] = (a.buckets[key] ?? 0) + (right.buckets[key] ?? 0)
      }
      return {
        kind: 'distribution',
        total: a.total + right.total,
        buckets,
      }
    }
    case 'payout': {
      const right = b as RawPayoutMetric
      return {
        kind: 'payout',
        count: a.count + right.count,
        total: a.total + right.total,
        min: a.min === null ? right.min : right.min === null ? a.min : Math.min(a.min, right.min),
        max: a.max === null ? right.max : right.max === null ? a.max : Math.max(a.max, right.max),
      }
    }
    case 'rtp': {
      const right = b as RawRtpMetric
      return {
        kind: 'rtp',
        count: a.count + right.count,
        total: a.total + right.total,
      }
    }
  }
}

function mergeScopes(a: RawMetricScope, b: RawMetricScope): RawMetricScope {
  const metrics: Record<string, RawScopedMetric> = {}

  for (const name in a.metrics) {
    const left = a.metrics[name]!
    const right = b.metrics[name]

    if (!right) {
      metrics[name] = left
      continue
    }

    metrics[name] = mergeScopedMetric(left, right)
  }

  for (const name in b.metrics) {
    if (!(name in a.metrics)) {
      metrics[name] = b.metrics[name]!
    }
  }

  const scopes: Record<string, RawMetricScope> = {}

  for (const name in a.scopes) {
    const left = a.scopes[name]!
    const right = b.scopes[name]

    if (!right) {
      scopes[name] = left
      continue
    }

    scopes[name] = mergeScopes(left, right)
  }

  for (const name in b.scopes) {
    if (!(name in a.scopes)) {
      scopes[name] = b.scopes[name]!
    }
  }

  return { metrics, scopes }
}

function finalizeMetric(
  metric: RawScopedMetric,
  rounds: number,
  totalBet: number,
): FinalScopedMetric {
  switch (metric.kind) {
    case 'count':
      return {
        kind: 'count',
        total: metric.total,
        rate: rounds > 0 ? metric.total / rounds : 0,
        cycle: metric.total > 0 ? rounds / metric.total : null,
      }
    case 'value':
      return {
        kind: 'value',
        count: metric.count,
        sum: metric.sum,
        average: metric.count > 0 ? metric.sum / metric.count : 0,
        min: metric.min,
        max: metric.max,
      }
    case 'distribution':
      return {
        kind: 'distribution',
        total: metric.total,
        buckets: Object.fromEntries(
          Object.entries(metric.buckets).map(([bucket, count]) => [
            bucket,
            {
              count,
              ratio: metric.total > 0 ? count / metric.total : 0,
            },
          ]),
        ),
      }
    case 'payout':
      return {
        kind: 'payout',
        count: metric.count,
        total: metric.total,
        average: metric.count > 0 ? metric.total / metric.count : 0,
        min: metric.min,
        max: metric.max,
      }
    case 'rtp':
      return {
        kind: 'rtp',
        count: metric.count,
        total: metric.total,
        ratio: totalBet > 0 ? metric.total / totalBet : null,
      }
  }
}

function finalizeScope(
  scope: RawMetricScope,
  path: string[],
  rounds: number,
  totalBet: number,
): FinalMetricScope {
  return {
    path,
    metrics: Object.fromEntries(
      Object.entries(scope.metrics).map(([name, metric]) => [
        name,
        finalizeMetric(metric, rounds, totalBet),
      ]),
    ),
    scopes: Object.fromEntries(
      Object.entries(scope.scopes).map(([name, child]) => [
        name,
        finalizeScope(child, [...path, name], rounds, totalBet),
      ]),
    ),
  }
}

class ScopeHandle implements ScopedMetrics {
  constructor(
    private readonly collector: ModernDataCollector,
    private readonly path: string[],
  ) {}

  scope(path: string | MetricScopePath): ScopedMetrics {
    return new ScopeHandle(this.collector, [...this.path, ...normalizeScopePath(path)])
  }

  count(name: string, amount = 1): void {
    this.collector.recordCount(this.path, name, amount)
  }

  value(name: string, observed: number): void {
    this.collector.recordValue(this.path, name, observed)
  }

  distribution(name: string, bucket: string, amount = 1): void {
    this.collector.recordDistribution(this.path, name, bucket, amount)
  }

  payout(name: string, amount: number): void {
    this.collector.recordPayout(this.path, name, amount)
  }

  rtp(name: string, amount: number): void {
    this.collector.recordRtp(this.path, name, amount)
  }
}

export class ModernDataCollector implements DataCollector {
  private readonly rootRecorder = new ScopeHandle(this, [])
  private raw: RawSimulationMetrics = Metrics.emptyRaw()
  private scopeCache = new Map<string, RawMetricScope>()

  private betAmount = 0
  private currentRoundWin = 0
  private currentRoundResultCount = 0
  private currentRoundMaxResultWin = 0
  private currentCountsByType: Partial<Record<SpinType, number>> = {}
  private currentWinsByType: Partial<Record<SpinType, WinComponents>> = {}
  private lastRoundSnapshot: RoundMetricsSnapshot | null = null

  scope(path: string | MetricScopePath): ScopedMetrics {
    return this.rootRecorder.scope(path)
  }

  count(name: string, amount = 1): void {
    this.rootRecorder.count(name, amount)
  }

  value(name: string, observed: number): void {
    this.rootRecorder.value(name, observed)
  }

  distribution(name: string, bucket: string, amount = 1): void {
    this.rootRecorder.distribution(name, bucket, amount)
  }

  payout(name: string, amount: number): void {
    this.rootRecorder.payout(name, amount)
  }

  rtp(name: string, amount: number): void {
    this.rootRecorder.rtp(name, amount)
  }

  beginRound(bet: number): void {
    this.betAmount = bet
    this.currentRoundWin = 0
    this.currentRoundResultCount = 0
    this.currentRoundMaxResultWin = 0
    this.currentCountsByType = {}
    this.currentWinsByType = {}
    this.lastRoundSnapshot = null
    this.scopeCache.clear()
  }

  collect(result: SpinResult): void {
    this.raw.totalWin += result.win
    this.raw.totalSpinResults++

    this.currentRoundWin += result.win
    this.currentRoundResultCount++
    this.currentRoundMaxResultWin = Math.max(this.currentRoundMaxResultWin, result.win)

    this.currentCountsByType[result.type] = (this.currentCountsByType[result.type] ?? 0) + 1

    const typeWins = (this.currentWinsByType[result.type] ??= {})

    if (result.components) {
      const c = result.components
      if (c.total !== undefined) typeWins.total = (typeWins.total ?? 0) + c.total
      if (c.scatter !== undefined) typeWins.scatter = (typeWins.scatter ?? 0) + c.scatter
      if (c.lines !== undefined) typeWins.lines = (typeWins.lines ?? 0) + c.lines
    } else {
      typeWins.total = (typeWins.total ?? 0) + result.win
    }
  }

  endRound(): void {
    if (this.betAmount <= 0) return

    this.raw.rounds++
    this.raw.totalBet += this.betAmount
    this.raw.maxRoundWin = Math.max(this.raw.maxRoundWin, this.currentRoundWin)

    const roundMultiplier = this.currentRoundWin / this.betAmount

    this.raw.maxRoundWinMultiplier = Math.max(this.raw.maxRoundWinMultiplier, roundMultiplier)

    this.raw.sumRoundWinMultiplier += roundMultiplier
    this.raw.sumSquaresRoundWinMultiplier += roundMultiplier * roundMultiplier

    this.count('rounds')
    this.rtp('round-rtp', this.currentRoundWin)
    this.value('round-win-amount', this.currentRoundWin)
    this.value('spins-per-round', this.currentRoundResultCount)
    this.distribution('round-win-multiplier', bucketRoundWin(roundMultiplier))

    for (const [type, count] of Object.entries(this.currentCountsByType)) {
      this.scope(['spin-types', type.toLowerCase()]).count('results', count)
    }

    this.lastRoundSnapshot = {
      bet: this.betAmount,
      totalWin: this.currentRoundWin,
      resultCount: this.currentRoundResultCount,
      maxResultWin: this.currentRoundMaxResultWin,
      countsByType: { ...this.currentCountsByType },
      winsByType: Object.fromEntries(
        Object.entries(this.currentWinsByType).map(([type, wins]) => [type, { ...wins }]),
      ) as Partial<Record<SpinType, WinComponents>>,
    }
  }

  getLastRoundSnapshot(): RoundMetricsSnapshot | null {
    return this.lastRoundSnapshot
  }

  getRawMetrics(): RawSimulationMetrics {
    return {
      rounds: this.raw.rounds,
      totalBet: this.raw.totalBet,
      totalWin: this.raw.totalWin,
      totalSpinResults: this.raw.totalSpinResults,
      maxRoundWin: this.raw.maxRoundWin,
      maxRoundWinMultiplier: this.raw.maxRoundWinMultiplier,
      sumRoundWinMultiplier: this.raw.sumRoundWinMultiplier,
      sumSquaresRoundWinMultiplier: this.raw.sumSquaresRoundWinMultiplier,
      rootScope: cloneScope(this.raw.rootScope),
    }
  }

  recordCount(path: string[], name: string, amount: number): void {
    if (amount === 0) return
    const scope = this.resolveScope(path)
    const current = scope.metrics[name]
    if (!current) {
      scope.metrics[name] = { kind: 'count', total: amount }
      return
    }
    if (current.kind !== 'count') {
      throw new Error(`Metric "${name}" in scope "${path.join('/')}" is not a count`)
    }
    current.total += amount
  }

  recordValue(path: string[], name: string, observed: number): void {
    const scope = this.resolveScope(path)
    const current = scope.metrics[name]
    if (!current) {
      scope.metrics[name] = {
        kind: 'value',
        count: 1,
        sum: observed,
        min: observed,
        max: observed,
      }
      return
    }
    if (current.kind !== 'value') {
      throw new Error(`Metric "${name}" in scope "${path.join('/')}" is not a value`)
    }
    current.count++
    current.sum += observed
    current.min = current.min === null ? observed : Math.min(current.min, observed)
    current.max = current.max === null ? observed : Math.max(current.max, observed)
  }

  recordDistribution(path: string[], name: string, bucket: string, amount: number): void {
    if (amount === 0) return
    const scope = this.resolveScope(path)
    const current = scope.metrics[name]
    if (!current) {
      scope.metrics[name] = {
        kind: 'distribution',
        total: amount,
        buckets: { [bucket]: amount },
      }
      return
    }
    if (current.kind !== 'distribution') {
      throw new Error(`Metric "${name}" in scope "${path.join('/')}" is not a distribution`)
    }
    current.total += amount
    current.buckets[bucket] = (current.buckets[bucket] ?? 0) + amount
  }

  recordPayout(path: string[], name: string, amount: number): void {
    const scope = this.resolveScope(path)
    const current = scope.metrics[name]
    if (!current) {
      scope.metrics[name] = {
        kind: 'payout',
        count: 1,
        total: amount,
        min: amount,
        max: amount,
      }
      return
    }
    if (current.kind !== 'payout') {
      throw new Error(`Metric "${name}" in scope "${path.join('/')}" is not a payout`)
    }
    current.count++
    current.total += amount
    current.min = current.min === null ? amount : Math.min(current.min, amount)
    current.max = current.max === null ? amount : Math.max(current.max, amount)
  }

  recordRtp(path: string[], name: string, amount: number): void {
    const scope = this.resolveScope(path)
    const current = scope.metrics[name]
    if (!current) {
      scope.metrics[name] = {
        kind: 'rtp',
        count: 1,
        total: amount,
      }
      return
    }
    if (current.kind !== 'rtp') {
      throw new Error(`Metric "${name}" in scope "${path.join('/')}" is not an rtp`)
    }
    current.count++
    current.total += amount
  }

  private resolveScope(path: string[]): RawMetricScope {
    if (path.length === 0) return this.raw.rootScope

    const key = path.join('/')

    const cached = this.scopeCache.get(key)
    if (cached) return cached

    let scope = this.raw.rootScope

    for (const segment of path) {
      scope.scopes[segment] ??= emptyScope()
      scope = scope.scopes[segment]!
    }

    this.scopeCache.set(key, scope)

    return scope
  }
}

export const Metrics = {
  merge(a: RawSimulationMetrics, b: RawSimulationMetrics): RawSimulationMetrics {
    return {
      rounds: a.rounds + b.rounds,
      totalBet: a.totalBet + b.totalBet,
      totalWin: a.totalWin + b.totalWin,
      totalSpinResults: a.totalSpinResults + b.totalSpinResults,
      maxRoundWin: Math.max(a.maxRoundWin, b.maxRoundWin),
      maxRoundWinMultiplier: Math.max(a.maxRoundWinMultiplier, b.maxRoundWinMultiplier),
      sumRoundWinMultiplier: a.sumRoundWinMultiplier + b.sumRoundWinMultiplier,
      sumSquaresRoundWinMultiplier: a.sumSquaresRoundWinMultiplier + b.sumSquaresRoundWinMultiplier,
      rootScope: mergeScopes(a.rootScope, b.rootScope),
    }
  },

  emptyRaw(): RawSimulationMetrics {
    const rootScope = emptyScope()
    rootScope.metrics['round-win-multiplier'] = {
      kind: 'distribution',
      total: 0,
      buckets: Object.fromEntries(DEFAULT_WIN_BUCKETS.map((key) => [key, 0])),
    }

    return {
      rounds: 0,
      totalBet: 0,
      totalWin: 0,
      totalSpinResults: 0,
      maxRoundWin: 0,
      maxRoundWinMultiplier: 0,
      sumRoundWinMultiplier: 0,
      sumSquaresRoundWinMultiplier: 0,
      rootScope,
    }
  },

  finalize(raw: RawSimulationMetrics): SimulationMetrics {
    const mean = raw.rounds > 0 ? raw.sumRoundWinMultiplier / raw.rounds : 0
    const eX2 = raw.rounds > 0 ? raw.sumSquaresRoundWinMultiplier / raw.rounds : 0
    const variance = Math.max(0, eX2 - mean * mean)
    const scopes = finalizeScope(raw.rootScope, [], raw.rounds, raw.totalBet)

    const roundWinDistributionMetric = scopes.metrics['round-win-multiplier']
    const roundWinDistribution: FinalDistributionMetric =
      roundWinDistributionMetric?.kind === 'distribution'
        ? roundWinDistributionMetric
        : {
            kind: 'distribution',
            total: 0,
            buckets: Object.fromEntries(
              DEFAULT_WIN_BUCKETS.map((bucket) => [bucket, { count: 0, ratio: 0 }]),
            ),
          }

    const spinTypeScope = scopes.scopes['spin-types']
    const spinTypeBuckets: Record<string, FinalDistributionBucket> = {}
    let spinTypeTotal = 0
    if (spinTypeScope) {
      for (const [name, scope] of Object.entries(spinTypeScope.scopes)) {
        const resultsMetric = scope.metrics['results']
        if (resultsMetric?.kind === 'count') {
          spinTypeTotal += resultsMetric.total
          spinTypeBuckets[name] = { count: resultsMetric.total, ratio: 0 }
        }
      }
      for (const bucket of Object.values(spinTypeBuckets)) {
        bucket.ratio = spinTypeTotal > 0 ? bucket.count / spinTypeTotal : 0
      }
    }

    return {
      schemaVersion: 2,
      summary: {
        rounds: raw.rounds,
        totalBet: raw.totalBet,
        totalWin: raw.totalWin,
        averageBet: raw.rounds > 0 ? raw.totalBet / raw.rounds : 0,
        averageRoundWin: raw.rounds > 0 ? raw.totalWin / raw.rounds : 0,
        totalSpinResults: raw.totalSpinResults,
        rtp: raw.totalBet > 0 ? raw.totalWin / raw.totalBet : 0,
        maxRoundWin: raw.maxRoundWin,
        maxRoundWinMultiplier: raw.maxRoundWinMultiplier,
        variance: {
          mean,
          variance,
          stdDev: Math.sqrt(variance),
        },
        roundWinDistribution,
        resultTypeDistribution: {
          kind: 'distribution',
          total: spinTypeTotal,
          buckets: spinTypeBuckets,
        },
      },
      scopes,
    }
  },
}

export interface StateMachine<TResult extends SpinResult, TState = object> {
  readonly state: TState

  spin(rng: Rng, wager: Wager): TResult

  next(rng: Rng): TResult | null

  recordResultMetrics?(
    collector: DataCollector,
    result: TResult,
    context: { phase: 'spin' | 'next'; wager: Wager },
  ): void

  recordRoundMetrics?(collector: DataCollector, round: RoundMetricsSnapshot, wager: Wager): void
}

export function runCycle<TResult extends SpinResult>(
  sm: StateMachine<TResult>,
  rng: Rng,
  collector: DataCollector,
  wager: Wager,
): void {
  collector.beginRound(wager.totalWager)

  const initial = sm.spin(rng, wager)
  collector.collect(initial)
  sm.recordResultMetrics?.(collector, initial, { phase: 'spin', wager })

  let nextResult: TResult | null
  while ((nextResult = sm.next(rng)) !== null) {
    collector.collect(nextResult)
    sm.recordResultMetrics?.(collector, nextResult, { phase: 'next', wager })
  }

  collector.endRound()

  const round = collector.getLastRoundSnapshot()
  if (round) {
    sm.recordRoundMetrics?.(collector, round, wager)
  }
}
