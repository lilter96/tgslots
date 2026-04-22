// woodland-worker.ts — Worker thread for parallel MC simulation
// Receives { seed, numSpins, workerId } via workerData, posts back results.

import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import { BET, SPIN_WITH_SCATTER, WoodlandWhisperStateMachine } from '@tgslots/woodland-whisper'
import { ModernDataCollector, runCycle } from '@tgslots/slots-simulation-engine'

// ─── Config ─────────────────────────────────────────────────────────────────

interface WorkerConfig {
  seed: number
  numSpins: number
  workerId: number
}

const { seed, numSpins, workerId } = workerData as WorkerConfig

// ─── Run ─────────────────────────────────────────────────────────────────────

const rng = mt19937(seed)
for (let i = 0; i < 50_000; i++) SPIN_WITH_SCATTER.sample(rng) // JIT warmup

const t0 = performance.now()
const sm = new WoodlandWhisperStateMachine()
const collector = new ModernDataCollector()

for (let i = 0; i < numSpins; i++) {
  runCycle(sm, rng, collector, BET)
}

const rawMetrics = collector.getRawMetrics()
const elapsed = performance.now() - t0

parentPort!.postMessage({
  metrics: rawMetrics,
  elapsed,
  workerId,
  numSpins,
})
