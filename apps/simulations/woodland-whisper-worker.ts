// woodland-worker.ts — Worker thread for parallel MC simulation
// Receives { seed, numSpins, workerId } via workerData, posts back results.

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
}

const { seed, numSpins, workerId } = workerData as WorkerConfig

// ─── Run ─────────────────────────────────────────────────────────────────────

const rng = mt19937(seed)

// JIT warmup
const wager = BET_CONFIG.baseCost
const bet = Bet.fromTotalWager(wager, BET_CONFIG)
const breakdown = WagerBreakdown.fromBet(bet, BET_CONFIG)
const sampler = WOODLAND_WHISPER_SAMPLER(breakdown, false)
for (let i = 0; i < 50_000; i++) sampler.sample(rng)

const t0 = performance.now()
const sm = new WoodlandWhisperStateMachine()
const collector = new ModernDataCollector()

for (let i = 0; i < numSpins; i++) {
  runCycle(sm, rng, collector, BET_CONFIG.baseCost)
}

const rawMetrics = collector.getRawMetrics()
const elapsed = performance.now() - t0

parentPort!.postMessage({
  metrics: rawMetrics,
  elapsed,
  workerId,
  numSpins,
})
