/**
 * Per-mode RTP harness. Each volatility mode must converge to the same 98.4%;
 * stdDev shows the variance ordering (recon < assault < siege).
 *
 *   bun packages/games/le-militare/scripts/mode-rtp.ts
 */
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { ModernDataCollector, Metrics, runCycle } from '@tgslots/slots-simulation-engine'
import { LeMilitareStateMachine, BET_CONFIG } from '../src/index.js'
import { MODE_IDS } from '../src/constants.js'

const SPINS = 3_000_000
const SEED = 20240524

console.log(`Per-mode RTP over ${SPINS.toLocaleString()} spins (seed ${SEED}):`)
for (const mode of MODE_IDS) {
  const rng = mt19937(SEED)
  const wager = new Wager(1, BET_CONFIG)
  const sm = new LeMilitareStateMachine(undefined, mode)
  const collector = new ModernDataCollector()
  for (let i = 0; i < SPINS; i++) runCycle(sm, rng, collector, wager)
  const m = Metrics.finalize(collector.getRawMetrics()).summary
  console.log(
    `  ${mode.padEnd(8)} rtp=${(m.rtp * 100).toFixed(2)}%  stdDev=${m.variance.stdDev.toFixed(1)}  maxMult=${m.maxRoundWinMultiplier}`,
  )
}
