// ════════════════════════════════════════════════════════════════════════════════
// runner/index.ts — Generic parallel simulation runner with progress snapshots
// ════════════════════════════════════════════════════════════════════════════════

import { Worker } from 'node:worker_threads'
import { cpus } from 'node:os'
import {
  Metrics,
  type RawSimulationMetrics,
  type SimulationMetrics,
} from '../core/state-machine.js'

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

export interface WorkerPayload {
  seed: number
  numSpins: number
  workerId: number
  warmup: number
  snapshotBatchSize: number
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

// ─── Runner ───────────────────────────────────────────────────────────────

export async function runSimulation(
  workerPath: URL,
  config: SimRunnerConfig,
  progressCallback?: (snapshot: SimulationMetrics, elapsedSec: number) => void,
): Promise<SimRunnerResult> {
  const numWorkers = config.workers === 0 ? cpus().length : config.workers
  const batchSize = config.snapshotBatchSize ?? 50_000

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

    // Stores the latest snapshot from each worker
    const snapshots = new Map<number, RawSimulationMetrics>()
    // Track per-worker total elapsed
    const workerTimesMap = new Map<number, number>()
    const workers: Worker[] = []
    let progressTimer: ReturnType<typeof setInterval> | null = null

    const cleanup = () => {
      if (progressTimer) clearInterval(progressTimer)
      for (const w of workers) w.terminate().catch(() => {})
    }

    const t0 = performance.now()

    // Periodically merge snapshots and call progressCallback
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
