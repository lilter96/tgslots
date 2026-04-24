// ancient-dragon-worker.ts — Worker thread for parallel MC simulation
// Receives { seed, numSpins, workerId, warmup, snapshotBatchSize } via workerData, posts back results.

import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import { BET_CONFIG, AncientDragonStateMachine } from '@tgslots/ancient-dragon'
import { ModernDataCollector, runCycle } from '@tgslots/slots-simulation-engine'

// ─── Config ─────────────────────────────────────────────────────────────────

interface WorkerConfig {
  seed: number
  numSpins: number
  workerId: number
  warmup: number
  snapshotBatchSize: number
}

const { seed, numSpins, workerId, warmup, snapshotBatchSize } = workerData as WorkerConfig

// ─── Setup & warmup ─────────────────────────────────────────────────────────

const rng = mt19937(seed)

// JIT warmup on the real state machine
const warmupMachine = new AncientDragonStateMachine()
for (let i = 0; i < warmup; i++) {
  warmupMachine.spin(rng)
  while (warmupMachine.next(rng)) {
    // advance through features
  }
}

// ─── Main simulation loop with snapshot support ─────────────────────────────

const t0 = performance.now()
const sm = new AncientDragonStateMachine()
const collector = new ModernDataCollector()

let spinsDone = 0
while (spinsDone < numSpins) {
  const batchEnd = Math.min(spinsDone + snapshotBatchSize, numSpins)

  for (let i = spinsDone; i < batchEnd; i++) {
    runCycle(sm, rng, collector, BET_CONFIG.baseCost)
  }
  spinsDone = batchEnd

  const isFinal = spinsDone >= numSpins
  const snapshot = collector.getRawMetrics()

  parentPort!.postMessage({
    metrics: snapshot,
    workerId,
    final: isFinal,
    spinsProcessed: spinsDone,
    elapsed: isFinal ? performance.now() - t0 : undefined,
  })
}
