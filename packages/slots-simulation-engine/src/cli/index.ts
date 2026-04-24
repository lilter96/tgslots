// ════════════════════════════════════════════════════════════════════════════════
// cli/index.ts — CLI utilities with full snapshot support and game dispatching
// ════════════════════════════════════════════════════════════════════════════════

import { cpus } from 'node:os'
import * as fs from 'node:fs'
import type { SimRunnerConfig, SimRunnerResult } from '../runner/index.js'
import { runSimulation } from '../runner/index.js'
import { formatJson, formatPretty } from './formatter.js'
import type { SimulationMetrics } from '../core/state-machine.js'

// ─── CLI arg parsing ──────────────────────────────────────────────────────────

export type SimMode = 'benchmark' | 'verify' | 'sample'

export interface SimCliOpts extends SimRunnerConfig {
  game?: string // NEW: Target game identifier
  mode: SimMode
  json: boolean
  jsonOutput: string | null
  warmup: number
  snapshotInterval: number // seconds, 0 = disabled
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
    snapshotInterval: defaults?.snapshotInterval ?? 0,
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!,
      v = args[i + 1]
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
      case '--snapshot-interval':
        opts.snapshotInterval = parseFloat(v!)
        i++
        break
    }
  }
  if (opts.workers === 0) opts.workers = cpus().length
  return opts
}

// ─── Parsheet config ──────────────────────────────────────────────────────────

export interface ParsheetConfig {
  bet: number
  targetRTP: number
  scatterCycle?: number
  rtpTolerance?: number
  scatterTolerance?: number
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtSpins(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`
  return `${(n / 1e3).toFixed(0)}K`
}

// ─── Full snapshot printer (called from runner periodically) ───────────────

function printFullSnapshot(
  metrics: SimulationMetrics,
  elapsedSec: number,
  gameName: string,
  workers: number,
  parsheet: ParsheetConfig,
): void {
  console.clear()
  console.log(`\n  [Snapshot at ${elapsedSec.toFixed(1)}s]`)
  formatPretty(metrics, parsheet, gameName, elapsedSec * 1000, { workers }, true)
}

// ─── Result printing ──────────────────────────────────────────────────────────

export function printSimResult(
  result: SimRunnerResult,
  parsheet: ParsheetConfig,
  opts: SimCliOpts,
  gameName: string,
): void {
  const { metrics, wallTime } = result

  if (opts.jsonOutput || opts.json) {
    const report = formatJson(metrics, parsheet, gameName, wallTime)
    const json = JSON.stringify(report, null, 2)
    if (opts.jsonOutput) {
      fs.writeFileSync(opts.jsonOutput, json)
      console.log(`\n  [JSON report saved to ${opts.jsonOutput}]`)
    } else {
      console.log(json)
    }
    if (!opts.jsonOutput) return
  }

  formatPretty(metrics, parsheet, gameName, wallTime, { workers: opts.workers })

  if (opts.mode === 'verify') {
    const rtpTol = parsheet.rtpTolerance ?? 0.005
    const rtpDiff = Math.abs(metrics.rtp.total - parsheet.targetRTP)
    const rtpPass = rtpDiff < rtpTol

    const scTol = parsheet.scatterTolerance ?? 0.05
    const scTarget = parsheet.scatterCycle || 0
    const scDiff = scTarget > 0 ? Math.abs(metrics.scatter.cycle - scTarget) / scTarget : 0
    const scPass = scTarget > 0 ? scDiff < scTol : true

    const ok = (v: boolean) => (v ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m')

    console.log('\n  VERIFICATION RESULTS')
    console.log('  ' + '─'.repeat(20))
    console.log(
      `  RTP:         ${ok(rtpPass)}  (diff ${(rtpDiff * 100).toFixed(4)}%, tol ±${(rtpTol * 100).toFixed(2)}%)`,
    )
    if (scTarget > 0) {
      console.log(
        `  Scatter:     ${ok(scPass)}  (cycle ${metrics.scatter.cycle.toFixed(2)}, target ${scTarget.toFixed(2)}, tol ±${(scTol * 100).toFixed(1)}%)`,
      )
    }

    if (!rtpPass || !scPass) {
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

// ─── Combined run-and-print entry ─────────────────────────────────────────

export async function runAndPrint(
  workerURL: URL,
  opts: SimCliOpts,
  parsheet: ParsheetConfig,
  gameName: string,
): Promise<void> {
  if (opts.mode === 'sample') {
    return
  }

  if (!opts.json && opts.workers > 1) {
    console.log(`\n  Spawning ${opts.workers} workers…`)
  }

  const result = await runSimulation(
    workerURL,
    opts,
    opts.snapshotInterval > 0
      ? (metrics, elapsedSec) =>
          printFullSnapshot(metrics, elapsedSec, gameName, opts.workers, parsheet)
      : undefined,
  )

  printSimResult(result, parsheet, opts, gameName)

  if (!opts.json) console.log()
}
