// ════════════════════════════════════════════════════════════════════════════════
// runner/index.ts — Generic parallel simulation runner with progress snapshots
// ════════════════════════════════════════════════════════════════════════════════

import { Worker } from 'node:worker_threads'
import { cpus } from 'node:os'
import {
  Metrics,
  runCycle,
  type RawSimulationMetrics,
  type SimulationMetrics,
  type StateMachine,
  type DataCollector,
  type SpinResult,
} from '../core/state-machine.js'
import type { Rng } from '@tgslots/math/rng/types'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'

// ─── Public types ─────────────────────────────────────────────────────────

export interface SimRunnerConfig {
  spins: number
  workers: number
  seed: number
  warmup?: number
  /** Seconds between progress callbacks; 0 or undefined = disabled */
  snapshotInterval?: number
  /** Spin batches workers use for sending intermediate metrics; default 50k */
  snapshotBatchSize?: number
}

export interface WorkerSnapshot {
  metrics: RawSimulationMetrics
  workerId: number
  /** true when this is the last message from the worker */
  final: boolean
  spinsProcessed: number
  elapsed?: number // only present in final message
}

export interface SimRunnerResult {
  metrics: SimulationMetrics
  wallTime: number
  workerTimes: number[]
}

export interface WorkerPayload {
  seed: number
  numSpins: number
  workerId: number
  warmup: number
  snapshotBatchSize: number
  betMultiplier: number
  betConfig: {
    baseCost: number
    lineCount: number
    costPerLine: number
    sideBetBase: number
  }
  gameConfig?: Record<string, string>
}

// ─── Runner ───────────────────────────────────────────────────────────────

export async function runSimulation(
  workerPath: URL,
  config: SimRunnerConfig & {
    betMultiplier?: number
    betConfig?: BetConfiguration
    gameConfig?: Record<string, string>
  },
  progressCallback?: (snapshot: SimulationMetrics, elapsedSec: number) => void,
): Promise<SimRunnerResult> {
  const numWorkers = config.workers === 0 ? cpus().length : config.workers
  const batchSize = config.snapshotBatchSize ?? 50_000
  const betMultiplier = config.betMultiplier ?? 1
  const betConfig = config.betConfig ?? BetConfiguration.fromLineCount(1) // fallback

  if (config.spins === 0) {
    return {
      metrics: Metrics.finalize(Metrics.emptyRaw()),
      wallTime: 0,
      workerTimes: [],
    }
  }

  return new Promise((resolve, reject) => {
    const perWorker = Math.floor(config.spins / numWorkers)
    const remainder = config.spins - perWorker * numWorkers
    let completedWorkers = 0
    let rejected = false

    const snapshots = new Map<number, RawSimulationMetrics>()
    const workerTimesMap = new Map<number, number>()
    const workers: Worker[] = []
    let progressTimer: ReturnType<typeof setInterval> | null = null

    const cleanup = () => {
      if (progressTimer) clearInterval(progressTimer)
      for (const w of workers) w.terminate().catch(() => {})
    }

    const t0 = performance.now()

    if (config.snapshotInterval && config.snapshotInterval > 0 && progressCallback) {
      progressTimer = setInterval(() => {
        if (snapshots.size === 0) return
        let merged = Metrics.emptyRaw()
        for (const raw of snapshots.values()) {
          merged = Metrics.merge(merged, raw)
        }
        const elapsedSec = (performance.now() - t0) / 1000
        progressCallback(Metrics.finalize(merged), elapsedSec)
      }, config.snapshotInterval * 1000)
    }

    for (let w = 0; w < numWorkers; w++) {
      const numSpins = perWorker + (w < remainder ? 1 : 0)
      const payload: WorkerPayload = {
        seed: config.seed * 1000 + w * 7919,
        numSpins,
        workerId: w,
        warmup: config.warmup ?? 0,
        snapshotBatchSize: batchSize,
        betMultiplier,
        betConfig: betConfig.toJSON(),
        gameConfig: config.gameConfig,
      }
      const worker = new Worker(workerPath, { workerData: payload })
      workers.push(worker)

      worker.on('message', (msg: WorkerSnapshot) => {
        if (rejected) return
        snapshots.set(msg.workerId, msg.metrics)

        if (msg.final) {
          if (msg.elapsed !== undefined) {
            workerTimesMap.set(msg.workerId, msg.elapsed)
          }
          completedWorkers++
          if (completedWorkers === numWorkers) {
            const wallTime = performance.now() - t0
            let totalRaw = Metrics.emptyRaw()
            for (const raw of snapshots.values()) {
              totalRaw = Metrics.merge(totalRaw, raw)
            }
            cleanup()
            resolve({
              metrics: Metrics.finalize(totalRaw),
              wallTime,
              workerTimes: Array.from(workerTimesMap.values()),
            })
          }
        }
      })

      worker.on('error', (err) => {
        if (rejected) return
        rejected = true
        cleanup()
        reject(err)
      })

      worker.on('exit', (code) => {
        if (rejected) return
        if (code !== 0) {
          rejected = true
          cleanup()
          reject(new Error(`Worker ${w} exited with code ${code}`))
        }
      })
    }
  })
}

// ─── Worker Helpers ────────────────────────────────────────────────────────

/** Performs a JIT warmup by running the state machine without collecting metrics */
export function performWarmup<T extends SpinResult>(
  sm: StateMachine<T>,
  rng: Rng,
  count: number,
  wager: Wager,
): void {
  for (let i = 0; i < count; i++) {
    sm.spin(rng, wager)
    while (sm.next(rng)) {
      // advance
    }
  }
}

/** Standardized worker simulation loop with progress snapshots */
export function runWorkerLoop<T extends SpinResult>(
  sm: StateMachine<T>,
  rng: Rng,
  collector: DataCollector,
  config: {
    numSpins: number
    snapshotBatchSize: number
    workerId: number
    betMultiplier: number
    betConfig: {
      baseCost: number
      lineCount: number
      costPerLine: number
      sideBetBase: number
    }
  },
  postMessage: (msg: WorkerSnapshot) => void,
): void {
  const t0 = performance.now()
  let spinsDone = 0

  const bConfig = new BetConfiguration(
    config.betConfig.baseCost,
    config.betConfig.lineCount,
    config.betConfig.costPerLine,
    config.betConfig.sideBetBase,
  )
  const wager = new Wager(config.betMultiplier, bConfig)

  while (spinsDone < config.numSpins) {
    const batchEnd = Math.min(spinsDone + config.snapshotBatchSize, config.numSpins)

    for (let i = spinsDone; i < batchEnd; i++) {
      runCycle(sm, rng, collector, wager)
    }

    spinsDone = batchEnd
    const isFinal = spinsDone >= config.numSpins

    postMessage({
      metrics: collector.getRawMetrics(),
      workerId: config.workerId,
      final: isFinal,
      spinsProcessed: spinsDone,
      elapsed: isFinal ? performance.now() - t0 : undefined,
    })
  }
}
