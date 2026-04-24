// woodland-worker.ts — Worker thread for parallel MC simulation
// Receives { seed, numSpins, workerId, warmup, snapshotBatchSize } via workerData, posts back results.

import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import {
  BET_CONFIG,
  WoodlandWhisperStateMachine,
  WOODLAND_WHISPER_SAMPLER,
} from '@tgslots/woodland-whisper'
import { ModernDataCollector, runCycle } from '@tgslots/slots-simulation-engine'
import { WagerBreakdown, Bet } from '@tgslots/slots-core/betting'

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

// 1. JIT warmup of the math / sampler layer
const wager = BET_CONFIG.baseCost
const bet = Bet.fromTotalWager(wager, BET_CONFIG)
const breakdown = WagerBreakdown.fromBet(bet, BET_CONFIG)
const sampler = WOODLAND_WHISPER_SAMPLER(breakdown, false)
for (let i = 0; i < 10_000; i++) sampler.sample(rng)

// 2. Warmup on the real state machine using the passed `warmup` count
const warmupMachine = new WoodlandWhisperStateMachine()
for (let i = 0; i < warmup; i++) {
  warmupMachine.spin(rng)
  while (warmupMachine.next(rng)) {
    // absorb feature spins
  }
}

// ─── Main simulation loop with snapshot support ─────────────────────────────

const t0 = performance.now()
const sm = new WoodlandWhisperStateMachine()
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
