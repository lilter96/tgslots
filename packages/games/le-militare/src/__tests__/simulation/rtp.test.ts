import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { ModernDataCollector, Metrics, runCycle } from '@tgslots/slots-simulation-engine'
import { LeMilitareStateMachine, BET_CONFIG } from '../../index.js'
import config from '../../../config/config.json' with { type: 'json' }

// Le Militare has no closed-form RTP (cascades, persistent armed reels +
// multiplier, retriggers), so RTP is verified by Monte-Carlo simulation. The
// seed is fixed so the result is deterministic; the band is wide enough to stay
// stable yet catch any material math regression (a broken config returns many
// multiples of stake, not fractions of a percent off).
const SPINS = 500_000
const SEED = 20240524
const TARGET = config.game_metadata.rtp_target
const MAX_WIN = config.game_metadata.max_win_multiplier

describe('le-militare RTP simulation', () => {
  it(`converges near target (${TARGET}) and respects the ${MAX_WIN}x cap`, () => {
    const rng = mt19937(SEED)
    const wager = new Wager(1, BET_CONFIG)
    const sm = new LeMilitareStateMachine()
    const collector = new ModernDataCollector()

    for (let i = 0; i < SPINS; i++) runCycle(sm, rng, collector, wager)

    const { rtp, maxRoundWinMultiplier } = Metrics.finalize(collector.getRawMetrics()).summary

    expect(rtp).toBeGreaterThan(TARGET - 0.04)
    expect(rtp).toBeLessThan(TARGET + 0.04)
    expect(maxRoundWinMultiplier).toBeLessThanOrEqual(MAX_WIN)
  }, 120_000)
})
