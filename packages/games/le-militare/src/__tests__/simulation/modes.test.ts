import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { ModernDataCollector, Metrics, runCycle } from '@tgslots/slots-simulation-engine'
import { LeMilitareStateMachine, BET_CONFIG } from '../../index.js'
import { MODE_IDS } from '../../constants.js'
import config from '../../../config/config.json' with { type: 'json' }

// Every volatility mode is tuned to the same RTP and differs only in variance.
// Deterministic seed; the band is wide enough for 400k-spin sampling noise on the
// high-variance siege mode yet catches a materially broken mode.
const SPINS = 400_000
const SEED = 20240524
const TARGET = config.game_metadata.rtp_target

describe('le-militare per-mode RTP', () => {
  for (const mode of MODE_IDS) {
    it(`${mode} converges near ${TARGET}`, () => {
      const rng = mt19937(SEED)
      const wager = new Wager(1, BET_CONFIG)
      const sm = new LeMilitareStateMachine(undefined, mode)
      const collector = new ModernDataCollector()
      for (let i = 0; i < SPINS; i++) runCycle(sm, rng, collector, wager)
      const { rtp } = Metrics.finalize(collector.getRawMetrics()).summary
      expect(rtp).toBeGreaterThan(TARGET - 0.08)
      expect(rtp).toBeLessThan(TARGET + 0.08)
    }, 120_000)
  }
})
