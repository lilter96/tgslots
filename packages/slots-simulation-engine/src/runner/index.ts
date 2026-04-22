// ════════════════════════════════════════════════════════════════════════════════
// runner/index.ts — Generic parallel simulation runner
// Spawns worker threads by URL, aggregates results.
// Workers must accept { seed, numSpins, workerId } via workerData and post back
// { totalWin, scatterTriggers, elapsed, workerId, numSpins }.
// ════════════════════════════════════════════════════════════════════════════════

import { Worker } from 'node:worker_threads'
import { cpus } from 'node:os'
import {
  Metrics,
  type RawSimulationMetrics,
  type SimulationMetrics,
} from '../core/state-machine.js'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SimRunnerConfig {
  spins: number
  workers: number // 0 = use all CPUs
  seed: number
  warmup?: number // passed to worker via workerData (workers may ignore)
}

export interface WorkerPayload {
  seed: number
  numSpins: number
  workerId: number
}

export interface WorkerResult {
  metrics: RawSimulationMetrics
  elapsed: number
  workerId: number
  numSpins: number
}

export interface SimRunnerResult {
  metrics: SimulationMetrics
  wallTime: number
  workerTimes: number[]
}

// ─── Parallel runner ──────────────────────────────────────────────────────────

export async function runSimulation(
  workerPath: URL,
  config: SimRunnerConfig,
): Promise<SimRunnerResult> {
  const numWorkers = config.workers === 0 ? cpus().length : config.workers

  return new Promise((resolve, reject) => {
    const perWorker = Math.floor(config.spins / numWorkers)
    const remainder = config.spins - perWorker * numWorkers
    const results: WorkerResult[] = []
    let completed = 0
    const t0 = performance.now()

    for (let w = 0; w < numWorkers; w++) {
      const numSpins = perWorker + (w < remainder ? 1 : 0)
      const payload: WorkerPayload = {
        seed: config.seed * 1000 + w * 7919,
        numSpins,
        workerId: w,
      }
      const worker = new Worker(workerPath, { workerData: payload })
      worker.on('message', (r: WorkerResult) => {
        results.push(r)
        if (++completed === numWorkers) {
          const wallTime = performance.now() - t0
          const totalRaw = results.reduce(
            (acc, res) => Metrics.merge(acc, res.metrics),
            Metrics.emptyRaw(),
          )
          resolve({
            metrics: Metrics.finalize(totalRaw),
            wallTime,
            workerTimes: results.map((x) => x.elapsed),
          })
        }
      })
      worker.on('error', reject)
    }
  })
}
