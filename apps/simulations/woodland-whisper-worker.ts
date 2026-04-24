// woodland-worker.ts — Worker thread for parallel MC simulation
// Receives { seed, numSpins, workerId, warmup, snapshotBatchSize } via workerData, posts back results.

import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import {
  BET_CONFIG,
  WoodlandWhisperStateMachine,
  WOODLAND_WHISPER_SAMPLER,
} from '@tgslots/woodland-whisper'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import {
  performWarmup,
  runWorkerLoop,
  type WorkerPayload,
} from '@tgslots/slots-simulation-engine/runner'
import { WagerBreakdown, Bet } from '@tgslots/slots-core/betting'

// ─── Config ─────────────────────────────────────────────────────────────────

const { seed, numSpins, workerId, warmup, snapshotBatchSize } = workerData as WorkerPayload

// ─── Setup & warmup ─────────────────────────────────────────────────────────

const rng = mt19937(seed)

// 1. JIT warmup of the math / sampler layer
const wager = BET_CONFIG.baseCost
const bet = Bet.fromTotalWager(wager, BET_CONFIG)
const breakdown = WagerBreakdown.fromBet(bet, BET_CONFIG)
const sampler = WOODLAND_WHISPER_SAMPLER(breakdown, false)
for (let i = 0; i < 10_000; i++) sampler.sample(rng)

// 2. Warmup on the real state machine
const sm = new WoodlandWhisperStateMachine()
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
