import type {
  FinalMetricScope,
  FinalScopedMetric,
  SimulationMetrics,
} from '../core/state-machine.js'
import {
  evaluateComparisons,
  normalizeParsheetConfig,
  type ComparisonResult,
  type ParsheetConfig,
} from './comparison.js'

export interface SimulationJsonReport {
  schemaVersion: 2
  meta: {
    game: string
    wallMs: number
    throughputMps: number
    usPerSpin: number
  }
  reference: ReturnType<typeof normalizeParsheetConfig>['metadata']
  summary: SimulationMetrics['summary']
  comparisons: ComparisonResult[]
  scopes: SimulationMetrics['scopes']
}

function formatMetricNumber(
  value: number | null,
  format: 'number' | 'percent' | 'multiplier' = 'number',
): string {
  if (value === null) return 'N/A'
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(4)}%`
    case 'multiplier':
      return `${value.toFixed(2)}x`
    case 'number':
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 4,
      })
  }
}

function describeMetric(metric: FinalScopedMetric): string {
  switch (metric.kind) {
    case 'count':
      return `total=${metric.total.toLocaleString()} rate=${metric.rate.toFixed(4)} cycle=${
        metric.cycle === null ? 'N/A' : metric.cycle.toFixed(2)
      }`
    case 'value':
      return `avg=${metric.average.toFixed(4)} min=${metric.min ?? 'N/A'} max=${metric.max ?? 'N/A'} sum=${metric.sum.toLocaleString()}`
    case 'payout':
      return `avg=${metric.average.toFixed(4)} total=${metric.total.toLocaleString()} ratio=${
        metric.ratio === null ? 'N/A' : metric.ratio.toFixed(4)
      }`
    case 'distribution': {
      const entries = Object.entries(metric.buckets)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([bucket, value]) => `${bucket}:${(value.ratio * 100).toFixed(2)}%`)
      return `total=${metric.total.toLocaleString()} buckets=[${entries.join(', ')}]`
    }
  }
}

function printScope(scope: FinalMetricScope, indent = ''): void {
  for (const [metricName, metric] of Object.entries(scope.metrics)) {
    console.log(`${indent}${metricName.padEnd(24)} ${describeMetric(metric)}`)
  }

  for (const [childName, childScope] of Object.entries(scope.scopes)) {
    const label = childScope.path.length === 0 ? childName : childScope.path.join('/')
    console.log(`${indent}[${label}]`)
    printScope(childScope, `${indent}  `)
  }
}

export function formatJson(
  metrics: SimulationMetrics,
  parsheet: ParsheetConfig,
  gameName: string,
  wallMs: number,
): SimulationJsonReport {
  const normalizedReference = normalizeParsheetConfig(parsheet)
  const spins = metrics.summary.rounds

  return {
    schemaVersion: 2,
    meta: {
      game: gameName,
      wallMs,
      throughputMps: wallMs > 0 ? spins / 1000 / (wallMs / 1000) : 0,
      usPerSpin: spins > 0 ? (wallMs * 1000) / spins : 0,
    },
    reference: normalizedReference.metadata,
    summary: metrics.summary,
    comparisons: evaluateComparisons(metrics, parsheet),
    scopes: metrics.scopes,
  }
}

export function formatPretty(
  metrics: SimulationMetrics,
  parsheet: ParsheetConfig,
  gameName: string,
  wallMs: number,
  opts: { workers: number },
): void {
  const comparisons = evaluateComparisons(metrics, parsheet)
  const throughput = wallMs > 0 ? metrics.summary.rounds / 1000 / (wallMs / 1000) : 0
  const usPerSpin = metrics.summary.rounds > 0 ? (wallMs * 1000) / metrics.summary.rounds : 0

  console.log('═'.repeat(72))
  console.log(`  SIMULATION REPORT: ${gameName.toUpperCase()}`)
  console.log('═'.repeat(72))
  console.log(`  Rounds:           ${metrics.summary.rounds.toLocaleString()}`)
  console.log(`  Avg Bet:          ${metrics.summary.averageBet.toLocaleString()}`)
  console.log(`  Total Win:        ${metrics.summary.totalWin.toLocaleString()}`)
  console.log(`  RTP:              ${(metrics.summary.rtp * 100).toFixed(4)}%`)
  console.log(`  Max Round Win:    ${metrics.summary.maxRoundWin.toLocaleString()}`)
  console.log(`  Max Win / Bet:    ${metrics.summary.maxRoundWinMultiplier.toFixed(2)}x`)
  console.log(`  StdDev:           ${metrics.summary.variance.stdDev.toFixed(6)}`)
  console.log(`  Workers:          ${opts.workers}`)
  console.log(`  Wall Time:        ${(wallMs / 1000).toFixed(2)}s`)
  console.log(`  Throughput:       ${throughput.toFixed(2)}M rounds/sec`)
  console.log(`  Latency:          ${usPerSpin.toFixed(3)} µs/round`)
  console.log('─'.repeat(72))

  if (comparisons.length > 0) {
    console.log('  COMPARISONS')
    console.log('  ' + '─'.repeat(22))
    for (const comparison of comparisons) {
      const status =
        comparison.passed === null ? 'INFO' : comparison.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
      const deltaFormat =
        comparison.format === 'percent' ? 'percent' : comparison.format === 'multiplier' ? 'multiplier' : 'number'
      console.log(
        `  ${comparison.label.padEnd(24)} ${status}  actual=${formatMetricNumber(
          comparison.actual,
          comparison.format,
        )}  target=${formatMetricNumber(comparison.expected, comparison.format)}  delta=${formatMetricNumber(
          comparison.delta,
          deltaFormat,
        )}`,
      )
    }
    console.log('─'.repeat(72))
  }

  console.log('  ROUND WIN DISTRIBUTION')
  console.log('  ' + '─'.repeat(22))
  for (const [bucket, value] of Object.entries(metrics.summary.roundWinDistribution.buckets)) {
    const barWidth = Math.round(value.ratio * 32)
    console.log(
      `  ${bucket.padEnd(12)} ${value.count.toLocaleString().padStart(10)} (${(
        value.ratio * 100
      ).toFixed(2)}%) ${'█'.repeat(barWidth)}`,
    )
  }
  console.log('─'.repeat(72))

  console.log('  SCOPED METRICS')
  console.log('  ' + '─'.repeat(22))
  printScope(metrics.scopes, '  ')
  console.log('═'.repeat(72))
}
