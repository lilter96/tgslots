// ancient-dragon-worker.ts — Worker thread for parallel MC simulation
// Receives { seed, numSpins, workerId, warmup, snapshotBatchSize, betMultiplier, betConfig } via workerData, posts back results.

import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import { AncientDragonStateMachine } from '@tgslots/ancient-dragon'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import {
  performWarmup,
  runWorkerLoop,
  type WorkerPayload,
} from '@tgslots/slots-simulation-engine/runner'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'

// ─── Config ─────────────────────────────────────────────────────────────────

const { seed, numSpins, workerId, warmup, snapshotBatchSize, betMultiplier, betConfig } =
  workerData as WorkerPayload

// ─── Setup & warmup ─────────────────────────────────────────────────────────

const rng = mt19937(seed)

const bConfig = new BetConfiguration(
  betConfig.baseCost,
  betConfig.lineCount,
  betConfig.costPerLine,
  betConfig.sideBetBase,
)
const wager = new Wager(betMultiplier, bConfig)

// JIT warmup on the real state machine
const sm = new AncientDragonStateMachine()
performWarmup(sm, rng, warmup, wager)

// ─── Main simulation ────────────────────────────────────────────────────────

runWorkerLoop(
  sm,
  rng,
  new ModernDataCollector(),
  {
    numSpins,
    snapshotBatchSize,
    workerId,
    betMultiplier,
    betConfig,
  },
  (msg) => parentPort!.postMessage(msg),
)
