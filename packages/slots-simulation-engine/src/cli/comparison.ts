import type {
  FinalMetricScope,
  FinalScopedMetric,
  SimulationMetrics,
} from '../core/state-machine.js'

export interface LegacyParsheetConfig {
  bet: number
  targetRTP: number
  scatterCycle?: number
  featurePayout?: number
  rtpTolerance?: number
  scatterTolerance?: number
}

export interface ComparisonTolerance {
  type: 'absolute' | 'relative'
  value: number
}

export interface ComparisonSourceSummary {
  kind: 'summary'
  key:
    | 'rtp'
    | 'rounds'
    | 'totalBet'
    | 'totalWin'
    | 'averageBet'
    | 'averageRoundWin'
    | 'totalSpinResults'
    | 'maxRoundWin'
    | 'maxRoundWinMultiplier'
    | 'variance'
    | 'stdDev'
}

export interface ComparisonSourceScope {
  kind: 'scope'
  scope: string[]
  metric: string
  field?: 'total' | 'rate' | 'cycle' | 'sum' | 'average' | 'min' | 'max' | 'ratio'
}

export type ComparisonSource = ComparisonSourceSummary | ComparisonSourceScope

export type ComparisonCategory = 'rtp' | 'cycle' | 'average' | 'distribution' | 'count'

export interface ComparisonTarget {
  id: string
  label: string
  expected: number
  source: ComparisonSource
  tolerance?: ComparisonTolerance
  format?: 'number' | 'percent' | 'multiplier'
  category?: ComparisonCategory
  description?: string
}

export interface NormalizedParsheetConfig {
  metadata?: {
    bet?: number
    source?: string
    notes?: string
    [key: string]: unknown
  }
  comparisons: ComparisonTarget[]
}

export type ParsheetConfig = LegacyParsheetConfig | NormalizedParsheetConfig

export interface ComparisonResult {
  id: string
  label: string
  expected: number
  actual: number | null
  delta: number | null
  relativeDelta: number | null
  passed: boolean | null
  tolerance?: ComparisonTolerance
  format: 'number' | 'percent' | 'multiplier'
  source: ComparisonSource
  category: ComparisonCategory
  description?: string
}

function isLegacyParsheetConfig(config: ParsheetConfig): config is LegacyParsheetConfig {
  return 'targetRTP' in config
}

function getScope(scope: FinalMetricScope, path: string[]): FinalMetricScope | null {
  let current: FinalMetricScope | null = scope
  for (const segment of path) {
    current = current.scopes[segment] ?? null
    if (!current) return null
  }
  return current
}

function getScopeMetric(
  metrics: SimulationMetrics,
  path: string[],
  metric: string,
): FinalScopedMetric | null {
  const scope = getScope(metrics.scopes, path)
  return scope?.metrics[metric] ?? null
}

function resolveSummaryValue(
  metrics: SimulationMetrics,
  key: ComparisonSourceSummary['key'],
): number {
  switch (key) {
    case 'rtp':
      return metrics.summary.rtp
    case 'rounds':
      return metrics.summary.rounds
    case 'totalBet':
      return metrics.summary.totalBet
    case 'totalWin':
      return metrics.summary.totalWin
    case 'averageBet':
      return metrics.summary.averageBet
    case 'averageRoundWin':
      return metrics.summary.averageRoundWin
    case 'totalSpinResults':
      return metrics.summary.totalSpinResults
    case 'maxRoundWin':
      return metrics.summary.maxRoundWin
    case 'maxRoundWinMultiplier':
      return metrics.summary.maxRoundWinMultiplier
    case 'variance':
      return metrics.summary.variance.variance
    case 'stdDev':
      return metrics.summary.variance.stdDev
  }
}

function resolveScopeMetricValue(
  metric: FinalScopedMetric,
  field: ComparisonSourceScope['field'] = 'total',
): number | null {
  switch (metric.kind) {
    case 'count':
      if (field === 'total') return metric.total
      if (field === 'rate') return metric.rate
      if (field === 'cycle') return metric.cycle
      return null
    case 'value':
      if (field === 'total' || field === 'sum') return metric.sum
      if (field === 'average') return metric.average
      if (field === 'min') return metric.min
      if (field === 'max') return metric.max
      return null
    case 'payout':
      if (field === 'total') return metric.total
      if (field === 'average') return metric.average
      if (field === 'min') return metric.min
      if (field === 'max') return metric.max
      return null
    case 'rtp':
      if (field === 'total') return metric.total
      if (field === 'ratio') return metric.ratio
      return null
    case 'distribution':
      return field === 'total' ? metric.total : null
  }
}

function resolveActualValue(metrics: SimulationMetrics, source: ComparisonSource): number | null {
  if (source.kind === 'summary') {
    return resolveSummaryValue(metrics, source.key)
  }

  const metric = getScopeMetric(metrics, source.scope, source.metric)
  if (!metric) return null
  return resolveScopeMetricValue(metric, source.field)
}

export function normalizeParsheetConfig(config: ParsheetConfig): NormalizedParsheetConfig {
  if (!isLegacyParsheetConfig(config)) {
    return {
      metadata: config.metadata,
      comparisons: config.comparisons.map((comparison) => ({
        format: 'number',
        ...comparison,
      })),
    }
  }

  const comparisons: ComparisonTarget[] = [
    {
      id: 'total-rtp',
      label: 'Total RTP',
      expected: config.targetRTP,
      source: { kind: 'summary', key: 'rtp' },
      tolerance: { type: 'absolute', value: config.rtpTolerance ?? 0.005 },
      format: 'percent',
    },
  ]

  if (config.scatterCycle !== undefined) {
    comparisons.push({
      id: 'feature-trigger-cycle',
      label: 'Feature Trigger Cycle',
      expected: config.scatterCycle,
      source: {
        kind: 'scope',
        scope: ['features', 'free-spins'],
        metric: 'triggers',
        field: 'cycle',
      },
      tolerance: { type: 'relative', value: config.scatterTolerance ?? 0.05 },
      format: 'number',
    })
  }

  if (config.featurePayout !== undefined) {
    comparisons.push({
      id: 'feature-payout',
      label: 'Feature Payout',
      expected: config.featurePayout,
      source: {
        kind: 'scope',
        scope: ['features', 'free-spins'],
        metric: 'bonus-payout',
        field: 'average',
      },
      format: 'number',
    })
  }

  return {
    metadata: { bet: config.bet, source: 'legacy-inline' },
    comparisons,
  }
}

export function evaluateComparisons(
  metrics: SimulationMetrics,
  reference: ParsheetConfig,
): ComparisonResult[] {
  const normalized = normalizeParsheetConfig(reference)

  return normalized.comparisons.map((comparison) => {
    const actual = resolveActualValue(metrics, comparison.source)
    const delta = actual === null ? null : actual - comparison.expected
    const relativeDelta =
      actual === null || comparison.expected === 0 || delta === null
        ? null
        : delta / comparison.expected

    let passed: boolean | null = null
    if (actual !== null && comparison.tolerance) {
      const diff =
        comparison.tolerance.type === 'absolute' ? Math.abs(delta!) : Math.abs(relativeDelta ?? 0)
      passed = diff <= comparison.tolerance.value
    } else if (actual !== null) {
      passed = null
    }

    return {
      id: comparison.id,
      label: comparison.label,
      expected: comparison.expected,
      actual,
      delta,
      relativeDelta,
      passed,
      tolerance: comparison.tolerance,
      format: comparison.format ?? 'number',
      source: comparison.source,
      category: comparison.category ?? inferCategory(comparison),
      description: comparison.description,
    }
  })
}

function inferCategory(comparison: ComparisonTarget): ComparisonCategory {
  const id = comparison.id.toLowerCase()
  if (comparison.format === 'percent' || id.includes('rtp')) return 'rtp'
  if (id.includes('cycle')) return 'cycle'
  if (id.includes('avg') || id.includes('average')) return 'average'
  if (comparison.source.kind === 'scope' && comparison.source.field === 'total') {
    return 'distribution'
  }
  return 'count'
}
