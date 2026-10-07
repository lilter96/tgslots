import { describe, it, expect } from 'bun:test'
import { ModernDataCollector, Metrics, runCycle } from '@tgslots/slots-simulation-engine'
import { createLeMilitareTestEngine } from '../test-engine.js'
import { MODE_IDS } from '../../constants.js'
import config from '../../../config/config.json' with { type: 'json' }

// Fixed-seed regression, evaluated against full-round sampling uncertainty.
// Longer independent audits (including confidence intervals) live in config/math-audit.json.
const SPINS = 1_000_000
const SEED = 20240524
const TARGET = config.game_metadata.rtp_target

describe('le-militare per-mode RTP', () => {
  for (const mode of MODE_IDS) {
    it(`${mode} converges near ${TARGET}`, () => {
      const engine = createLeMilitareTestEngine(mode)
      const rng = engine.rng(SEED)
      const wager = engine.wager()
      const sm = engine.createMachine()
      const collector = new ModernDataCollector()
      for (let i = 0; i < SPINS; i++) runCycle(sm, rng, collector, wager)
      const { rtp, variance } = Metrics.finalize(collector.getRawMetrics()).summary
      const samplingBand = (4 * variance.stdDev) / Math.sqrt(SPINS)
      expect(Math.abs(rtp - TARGET)).toBeLessThan(samplingBand + 0.005)
      expect(Math.abs(rtp - TARGET)).toBeLessThan(0.12)
    }, 120_000)
  }
})
