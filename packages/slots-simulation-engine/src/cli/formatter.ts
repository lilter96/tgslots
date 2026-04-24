import type { SimulationMetrics } from '../core/state-machine.js'
import type { ParsheetConfig } from './index.js'

export interface SimulationJsonReport {
  meta: {
    game: string
    spins: number
    bet: number
    wallMs: number
    throughputMps: number
    usPerSpin: number
  }
  rtp: {
    total: number
    base: number
    feature: number
    withoutJackpots: number
    targetRtp: number
    deltaVsTarget: number
  }
  hitRates: {
    baseHitRate: number
    baseHitCycle: number
    featureTriggerRate: number
    featureTriggerCycle: number
  }
  features: {
    totalTriggers: number
    totalRetriggers: number
    averageFeatureWin: number
    averageFeatureWinBet: number
    freeSpinsPlayed: number
    byType: Record<
      string,
      {
        count: number
        rate: number
        cycle: number
        avgWin: number
        avgWinBet: number
      }
    >
  }
  scatter: {
    distribution: Record<string, number>
    frequencies: Record<string, number>
    cycle: number
  }
  variance: {
    mean: number
    variance: number
    stdDev: number
  }
  volatility: {
    maxWinObserved: number
    maxWinObservedBet: number
    jackpotContribution: number
    winDistribution: Record<string, number>
    winDistributionPct: Record<string, number>
  }
}

export function formatJson(
  metrics: SimulationMetrics,
  parsheet: ParsheetConfig,
  gameName: string,
  wallMs: number,
): SimulationJsonReport {
  const totalBet = metrics.totalBet
  const spins = metrics.totalSamples
  const targetRtp = parsheet.targetRTP || 0

  const featureByType: Record<
    string,
    { count: number; rate: number; cycle: number; avgWin: number; avgWinBet: number }
  > = {}
  for (const [type, count] of Object.entries(metrics.features.featureCounts)) {
    featureByType[type] = {
      count,
      rate: spins > 0 ? count / spins : 0,
      cycle: count > 0 ? spins / count : 0,
      avgWin:
        count > 0
          ? (metrics.features.averageFeatureWin * metrics.features.totalTriggers) / count
          : 0,
      avgWinBet: 0,
    }
  }

  const winDistPct: Record<string, number> = {}
  for (const [bucket, count] of Object.entries(metrics.winDistribution)) {
    winDistPct[bucket] = spins > 0 ? count / spins : 0
  }

  const betPerRound = totalBet / spins

  return {
    meta: {
      game: gameName,
      spins,
      bet: betPerRound,
      wallMs,
      throughputMps: wallMs > 0 ? spins / 1000 / (wallMs / 1000) : 0,
      usPerSpin: spins > 0 ? (wallMs * 1000) / spins : 0,
    },
    rtp: {
      total: metrics.rtp.total,
      base: metrics.rtp.base,
      feature: metrics.rtp.feature,
      withoutJackpots: metrics.rtp.withoutJackpots,
      targetRtp,
      deltaVsTarget: metrics.rtp.total - targetRtp,
    },
    hitRates: {
      baseHitRate: metrics.hitRates.baseHitRate,
      baseHitCycle: metrics.hitRates.baseHitRate > 0 ? 1 / metrics.hitRates.baseHitRate : 0,
      featureTriggerRate: metrics.hitRates.featureTriggerRate,
      featureTriggerCycle:
        metrics.hitRates.featureTriggerRate > 0 ? 1 / metrics.hitRates.featureTriggerRate : 0,
    },
    features: {
      totalTriggers: metrics.features.totalTriggers,
      totalRetriggers: metrics.features.totalRetriggers,
      averageFeatureWin: metrics.features.averageFeatureWin,
      averageFeatureWinBet: betPerRound > 0 ? metrics.features.averageFeatureWin / betPerRound : 0,
      freeSpinsPlayed: metrics.features.freeSpinsPlayed,
      byType: featureByType,
    },
    scatter: {
      distribution: metrics.scatter.distribution,
      frequencies: metrics.scatter.frequencies,
      cycle: metrics.scatter.cycle,
    },
    variance: {
      mean: metrics.variance.mean,
      variance: metrics.variance.variance,
      stdDev: metrics.variance.stdDev,
    },
    volatility: {
      maxWinObserved: metrics.maxWinObserved,
      maxWinObservedBet: betPerRound > 0 ? metrics.maxWinObserved / betPerRound : 0,
      jackpotContribution: metrics.rtp.total - metrics.rtp.withoutJackpots,
      winDistribution: metrics.winDistribution,
      winDistributionPct: winDistPct,
    },
  }
}

export function formatPretty(
  metrics: SimulationMetrics,
  parsheet: ParsheetConfig,
  gameName: string,
  wallMs: number,
  opts: { workers: number },
  skipVerification = false,
): void {
  const spins = metrics.totalSamples
  const targetRtp = parsheet.targetRTP || 0
  const betPerRound = metrics.totalBet / spins

  console.log('═'.repeat(60))
  console.log(`  SIMULATION REPORT: ${gameName.toUpperCase()}`)
  console.log('═'.repeat(60))
  console.log(`  Spins:    ${spins.toLocaleString()}`)
  console.log(`  Bet:      ${betPerRound.toLocaleString()}`)
  console.log(`  Workers:  ${opts.workers}`)
  console.log('─'.repeat(60))

  // RTP Table
  console.log('  RTP BREAKDOWN')
  console.log('  ' + '─'.repeat(20))
  console.log(`  Base:             ${(metrics.rtp.base * 100).toFixed(4)}%`)
  console.log(`  Feature:          ${(metrics.rtp.feature * 100).toFixed(4)}%`)
  console.log(`  Total:            ${(metrics.rtp.total * 100).toFixed(4)}%`)
  console.log(`  Target:           ${(targetRtp * 100).toFixed(4)}%`)
  console.log(`  Delta:            ${((metrics.rtp.total - targetRtp) * 100).toFixed(4)}%`)
  console.log(`  Excl. Jackpots:   ${(metrics.rtp.withoutJackpots * 100).toFixed(4)}%`)
  console.log('─'.repeat(60))

  // Hit Rates
  console.log('  HIT RATES & CYCLES')
  console.log('  ' + '─'.repeat(20))
  const baseHitCycle = metrics.hitRates.baseHitRate > 0 ? 1 / metrics.hitRates.baseHitRate : 0
  console.log(
    `  Base Hit Rate:    ${(metrics.hitRates.baseHitRate * 100).toFixed(2)}% (1 in ${baseHitCycle.toFixed(2)})`,
  )
  console.log(
    `  Scatter Cycle:    ${metrics.scatter.cycle.toFixed(2)}  (Target: ${parsheet.scatterCycle?.toFixed(2) || 'N/A'})`,
  )
  console.log('─'.repeat(60))

  // Features
  console.log('  FEATURES')
  console.log('  ' + '─'.repeat(20))
  console.log(`  Total Triggers:   ${metrics.features.totalTriggers.toLocaleString()}`)
  console.log(`  Total Retriggers: ${metrics.features.totalRetriggers.toLocaleString()}`)
  console.log(
    `  Avg Feature Win:  ${metrics.features.averageFeatureWin.toFixed(2)} (${(metrics.features.averageFeatureWin / betPerRound).toFixed(2)}x bet)`,
  )
  console.log(`  Free Spins:       ${metrics.features.freeSpinsPlayed.toLocaleString()} played`)

  for (const [type, count] of Object.entries(metrics.features.featureCounts)) {
    const cycle = count > 0 ? spins / count : 0
    console.log(
      `  - ${type.padEnd(14)} ${count.toLocaleString().padStart(8)}  (1 in ${cycle.toFixed(2)})`,
    )
  }
  console.log('─'.repeat(60))

  // Scatter Distribution
  console.log('  SCATTER DISTRIBUTION')
  console.log('  ' + '─'.repeat(20))
  for (let i = 0; i <= 5; i++) {
    const count = metrics.scatter.distribution[String(i)] || 0
    const freq = spins > 0 ? (count / spins) * 100 : 0
    const marker = i >= 3 ? ' <- TRIGGER' : ''
    console.log(
      `  ${i} Scatters: ${count.toLocaleString().padStart(10)} (${freq.toFixed(4)}%)${marker}`,
    )
  }
  console.log('─'.repeat(60))

  // Variance
  console.log('  VARIANCE & VOLATILITY')
  console.log('  ' + '─'.repeat(20))
  console.log(`  Mean (E[X]):      ${metrics.variance.mean.toFixed(6)}`)
  console.log(`  Variance:         ${metrics.variance.variance.toFixed(6)}`)
  console.log(`  StdDev (σ):       ${metrics.variance.stdDev.toFixed(6)}`)
  console.log(
    `  Max Win:          ${metrics.maxWinObserved.toLocaleString()} (${(metrics.maxWinObserved / betPerRound).toFixed(2)}x bet)`,
  )
  console.log('─'.repeat(60))

  // Win Distribution
  console.log('  WIN DISTRIBUTION')
  console.log('  ' + '─'.repeat(20))
  const buckets = ['0x', '<1x', '1x-5x', '5x-20x', '20x-50x', '50x-100x', '>100x']
  for (const bucket of buckets) {
    const count = metrics.winDistribution[bucket] || 0
    const pct = spins > 0 ? count / spins : 0
    const barWidth = Math.floor(pct * 40)
    const bar = '█'.repeat(barWidth)
    console.log(
      `  ${bucket.padEnd(10)} ${count.toLocaleString().padStart(10)} (${(pct * 100).toFixed(2)}%) ${bar}`,
    )
  }
  console.log('─'.repeat(60))

  // Performance
  const throughput = wallMs > 0 ? spins / 1000 / (wallMs / 1000) : 0
  const usPerSpin = spins > 0 ? (wallMs * 1000) / spins : 0
  console.log('  PERFORMANCE')
  console.log('  ' + '─'.repeat(20))
  console.log(`  Wall Time:   ${(wallMs / 1000).toFixed(2)}s`)
  console.log(`  Throughput:  ${throughput.toFixed(2)}M spins/sec`)
  console.log(`  Latency:     ${usPerSpin.toFixed(3)} µs/spin`)
  console.log('═'.repeat(60))

  if (!skipVerification) {
    // Note: The caller handles the 'verify' block in cli/index.ts
    // or we could move it here. For now, it stays in cli/index.ts
    // to match the previous modular structure.
  }
}
