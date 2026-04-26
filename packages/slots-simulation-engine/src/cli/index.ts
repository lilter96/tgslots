import { cpus } from 'node:os'
import * as fs from 'node:fs'
import { BetConfiguration } from '@tgslots/slots-core/betting'
import type { SimRunnerConfig, SimRunnerResult } from '../runner/index.js'
import { runSimulation } from '../runner/index.js'
import { formatJson, formatPretty } from './formatter.js'
import type { SimulationMetrics } from '../core/state-machine.js'
import { visualizeMetrics } from '../visualizer/index.js'
import {
  evaluateComparisons,
  type ParsheetConfig,
  type ComparisonResult,
} from './comparison.js'

export type { ParsheetConfig } from './comparison.js'

export type SimMode = 'benchmark' | 'verify' | 'sample'

export interface SimCliOpts extends SimRunnerConfig {
  game?: string
  mode: SimMode
  json: boolean
  jsonOutput: string | null
  visualize: string | null
  warmup: number
  snapshotInterval: number
  betMultiplier: number
}

function parseNum(s: string): number {
  const t = s.replace(/_/g, '')
  if (/[Bb]$/.test(t)) return Math.round(parseFloat(t) * 1e9)
  if (/[Mm]$/.test(t)) return Math.round(parseFloat(t) * 1e6)
  if (/[Kk]$/.test(t)) return Math.round(parseFloat(t) * 1e3)
  return parseInt(t, 10)
}

export function parseSimArgs(defaults?: Partial<SimCliOpts>): SimCliOpts {
  const args = process.argv.slice(2)
  const opts: SimCliOpts = {
    game: defaults?.game,
    spins: defaults?.spins ?? 10_000_000,
    workers: defaults?.workers ?? 1,
    seed: defaults?.seed ?? 2024,
    warmup: defaults?.warmup ?? 100_000,
    mode: defaults?.mode ?? 'benchmark',
    json: defaults?.json ?? false,
    jsonOutput: defaults?.jsonOutput ?? null,
    visualize: defaults?.visualize ?? null,
    snapshotInterval: defaults?.snapshotInterval ?? 0,
    betMultiplier: defaults?.betMultiplier ?? 1,
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    const v = args[i + 1]
    switch (a) {
      case '--game':
      case '-g':
        opts.game = v
        i++
        break
      case '--spins':
      case '-n':
        opts.spins = parseNum(v!)
        i++
        break
      case '--workers':
      case '-w':
        opts.workers = parseInt(v!, 10)
        i++
        break
      case '--seed':
        opts.seed = parseInt(v!, 10)
        i++
        break
      case '--warmup':
        opts.warmup = parseNum(v!)
        i++
        break
      case '--mode':
        opts.mode = v as SimMode
        i++
        break
      case '--json':
        opts.json = true
        break
      case '--json-output':
        opts.jsonOutput = v!
        i++
        break
      case '--visualize':
        opts.visualize = v!
        i++
        break
      case '--snapshot-interval':
        opts.snapshotInterval = parseFloat(v!)
        i++
        break
      case '--multiplier':
      case '-m':
        opts.betMultiplier = parseInt(v!, 10)
        i++
        break
    }
  }

  if (opts.workers === 0) opts.workers = cpus().length
  return opts
}

function fmtSpins(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`
  return `${(n / 1e3).toFixed(0)}K`
}

function printVerification(comparisons: ComparisonResult[]): void {
  if (comparisons.length === 0) return

  console.log('\n  VERIFICATION RESULTS')
  console.log('  ' + '─'.repeat(22))

  for (const comparison of comparisons) {
    if (comparison.tolerance === undefined) continue
    const status =
      comparison.passed === true ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
    const deltaText =
      comparison.relativeDelta !== null && comparison.tolerance.type === 'relative'
        ? `${(comparison.relativeDelta * 100).toFixed(2)}%`
        : comparison.delta === null
          ? 'N/A'
          : comparison.delta.toFixed(6)
    const toleranceText =
      comparison.tolerance.type === 'relative'
        ? `±${(comparison.tolerance.value * 100).toFixed(2)}%`
        : `±${comparison.tolerance.value.toFixed(6)}`

    console.log(
      `  ${comparison.label.padEnd(24)} ${status}  diff=${deltaText}  tol=${toleranceText}`,
    )
  }
}

function printFullSnapshot(
  metrics: SimulationMetrics,
  elapsedSec: number,
  gameName: string,
  workers: number,
  parsheet: ParsheetConfig,
): void {
  console.clear()
  console.log(`\n  [Snapshot at ${elapsedSec.toFixed(1)}s]`)
  formatPretty(metrics, parsheet, gameName, elapsedSec * 1000, { workers })
}

export async function printSimResult(
  result: SimRunnerResult,
  parsheet: ParsheetConfig,
  opts: SimCliOpts,
  gameName: string,
): Promise<void> {
  const { metrics, wallTime } = result
  const report = formatJson(metrics, parsheet, gameName, wallTime)
  const comparisons = evaluateComparisons(metrics, parsheet)

  if (opts.visualize) {
    await visualizeMetrics(report, opts.visualize)
    console.log(`\n  [Visualization saved to ${opts.visualize}]`)
  }

  if (opts.jsonOutput || opts.json) {
    const json = JSON.stringify(report, null, 2)
    if (opts.jsonOutput) {
      fs.writeFileSync(opts.jsonOutput, json)
      console.log(`\n  [JSON report saved to ${opts.jsonOutput}]`)
    } else {
      console.log(json)
    }
    if (!opts.jsonOutput) {
      if (opts.mode === 'verify') {
        const hasFailures = comparisons.some(
          (comparison) => comparison.tolerance !== undefined && comparison.passed === false,
        )
        if (hasFailures) process.exitCode = 1
      }
      return
    }
  }

  formatPretty(metrics, parsheet, gameName, wallTime, { workers: opts.workers })

  if (opts.mode === 'verify') {
    printVerification(comparisons)
    const hasFailures = comparisons.some(
      (comparison) => comparison.tolerance !== undefined && comparison.passed === false,
    )
    if (hasFailures) {
      process.exitCode = 1
    }
  }
}

export function printSimHeader(opts: SimCliOpts, gameName: string): void {
  if (opts.json) return
  const w = opts.workers === 1 ? '1 (single-thread)' : `${opts.workers} (parallel)`
  console.log(`\x1b[32m\x1b[1m═══ ${gameName} — Simulation ═══\x1b[0m\n`)
  console.log(`  mode=${opts.mode}  spins=${fmtSpins(opts.spins)}  workers=${w}  seed=${opts.seed}`)
  console.log(`  CPUs available: ${cpus().length}`)
}

export async function runAndPrint(
  workerURL: URL,
  opts: SimCliOpts,
  parsheet: ParsheetConfig,
  gameName: string,
  betConfig?: BetConfiguration,
): Promise<void> {
  if (opts.mode === 'sample') return

  if (!opts.json && opts.workers > 1) {
    console.log(`\n  Spawning ${opts.workers} workers…`)
  }

  const result = await runSimulation(
    workerURL,
    { ...opts, betConfig },
    opts.snapshotInterval > 0
      ? (metrics, elapsedSec) =>
          printFullSnapshot(metrics, elapsedSec, gameName, opts.workers, parsheet)
      : undefined,
  )

  await printSimResult(result, parsheet, opts, gameName)

  if (!opts.json) console.log()
}
