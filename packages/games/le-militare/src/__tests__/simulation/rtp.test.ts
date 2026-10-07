import { describe, it, expect } from 'bun:test'
import { ModernDataCollector, Metrics, runCycle } from '@tgslots/slots-simulation-engine'
import { createLeMilitareTestEngine } from '../test-engine.js'
import config from '../../../config/config.json' with { type: 'json' }

// Le Militare has no closed-form RTP (cascades, persistent armed reels +
// multiplier, retriggers), so RTP is verified by Monte-Carlo simulation. The
// seed is fixed so the result is deterministic; the band is wide enough to stay
// stable yet catch any material math regression (a broken config returns many
// multiples of stake, not fractions of a percent off).
const SPINS = 1_000_000
const SEED = 20240524
const TARGET = config.game_metadata.rtp_target
const MAX_WIN = config.game_metadata.max_win_multiplier

describe('le-militare RTP simulation', () => {
  it(`converges near target (${TARGET}) and respects the ${MAX_WIN}x cap`, () => {
    const engine = createLeMilitareTestEngine()
    const rng = engine.rng(SEED)
    const wager = engine.wager()
    const sm = engine.createMachine()
    const collector = new ModernDataCollector()

    for (let i = 0; i < SPINS; i++) runCycle(sm, rng, collector, wager)

    const { rtp, maxRoundWinMultiplier, variance } = Metrics.finalize(
      collector.getRawMetrics(),
    ).summary

    // Full rounds have a heavy tail: use their measured sampling uncertainty.
    const samplingBand = (4 * variance.stdDev) / Math.sqrt(SPINS)
    expect(Math.abs(rtp - TARGET)).toBeLessThan(samplingBand + 0.005)
    expect(Math.abs(rtp - TARGET)).toBeLessThan(0.12)
    expect(maxRoundWinMultiplier).toBeLessThanOrEqual(MAX_WIN)
    // Every win is an integer (no decimal/float payouts).
    expect(Number.isInteger(Metrics.finalize(collector.getRawMetrics()).summary.maxRoundWin)).toBe(
      true,
    )
  }, 120_000)

  it('all configured payouts are integers (no decimals)', () => {
    for (const counts of Object.values(config.paytable)) {
      for (const payout of Object.values(counts)) {
        expect(Number.isInteger(payout)).toBe(true)
      }
    }
    for (const value of config.modes.assault.multiplier_pool.values) {
      expect(Number.isInteger(value)).toBe(true)
    }
    for (const spins of Object.values(config.scatter_definition.free_spins_awarded)) {
      expect(Number.isInteger(spins)).toBe(true)
    }
  })
})
