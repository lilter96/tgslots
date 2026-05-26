import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { ModernDataCollector, Metrics, runCycle } from '@tgslots/slots-simulation-engine'
import { LeMilitareStateMachine, BET_CONFIG } from '../../index.js'
import { MODE_IDS } from '../../constants.js'
import config from '../../../config/config.json' with { type: 'json' }

// Deterministic seed. 400k spins per mode with a ±0.05 band — tight enough
// to catch a materially broken mode (>5pp RTP drift) while tolerating the
// extra variance of siege's heavy tail. If this flakes, narrow the band after
// increasing spins.
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
      expect(rtp).toBeGreaterThan(TARGET - 0.05)
      expect(rtp).toBeLessThan(TARGET + 0.05)
    }, 120_000)
  }
})
