// ancient-dragon-worker.ts — Worker thread for parallel MC simulation
// Receives { seed, numSpins, workerId, warmup, snapshotBatchSize } via workerData, posts back results.

import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import { BET_CONFIG, AncientDragonStateMachine } from '@tgslots/ancient-dragon'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import {
  performWarmup,
  runWorkerLoop,
  type WorkerPayload,
} from '@tgslots/slots-simulation-engine/runner'

// ─── Config ─────────────────────────────────────────────────────────────────

const { seed, numSpins, workerId, warmup, snapshotBatchSize } = workerData as WorkerPayload

// ─── Setup & warmup ─────────────────────────────────────────────────────────

const rng = mt19937(seed)

// JIT warmup on the real state machine
const sm = new AncientDragonStateMachine()
performWarmup(sm, rng, warmup)

// ─── Main simulation ────────────────────────────────────────────────────────

runWorkerLoop(
  sm,
  rng,
  new ModernDataCollector(),
  {
    numSpins,
    snapshotBatchSize,
    workerId,
    betAmount: BET_CONFIG.baseCost,
  },
  (msg) => parentPort!.postMessage(msg),
)
