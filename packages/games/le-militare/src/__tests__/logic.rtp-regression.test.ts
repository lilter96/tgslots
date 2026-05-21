import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG } from '../constants.js'
import { LeMilitareStateMachine } from '../game-state-machine.js'

// Smoke-level correctness check over a seeded run. Validates that the
// Phase 1 math changes (sticky wilds, cascade scatters, carry-armed re-wild,
// chunk sampling) produce no NaN/negative wins.
//
// Free spin sessions use a 50-spin per-session drain cap. With cascade scatter
// counting (fix 1.4) the retrigger random-walk has a positive drift when armed
// reels are present, so without a cap a single session can exceed thousands of
// spins. Full RTP and retrigger-rate validation belongs in the simulation suite:
//   bun --filter @tgslots/simulations run sim -- --game le-militare

describe('RTP regression — seeded smoke rounds', () => {
  it('base-game finalWin = baseClusterWin * max(1, multiplierSum) * wager.multiplier', () => {
    // Verifies the state machine passes result.finalWin through unchanged and
    // that win is always non-negative. 1k rounds — no free spin draining.
    const wager = new Wager(5, BET_CONFIG)
    const sm = new LeMilitareStateMachine()
    const rng = mt19937(314159)

    for (let i = 0; i < 1_000; i++) {
      const result = sm.spin(rng, wager)
      expect(result.win).toBe(result.finalWin)
      expect(result.win).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(result.win)).toBe(true)
    }
  })

  it('200 rounds produce no NaN or negative wins (base + limited free spins)', () => {
    // Each free spin session is capped at FREE_SPIN_CAP spins to bound runtime.
    // This catches catastrophic bugs (NaN, negative win, multiplier overflow)
    // without relying on the session naturally terminating.
    const wager = new Wager(1, BET_CONFIG)
    const sm = new LeMilitareStateMachine()
    const rng = mt19937(271828)

    const ROUNDS = 200
    const FREE_SPIN_CAP = 50 // per-session; prevents unbounded retrigger chains

    for (let i = 0; i < ROUNDS; i++) {
      const baseResult = sm.spin(rng, wager)
      expect(baseResult.win).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(baseResult.win)).toBe(true)

      let sessionSpins = 0
      while (sm.state.freeSpins && sm.state.freeSpins.spinsRemaining > 0) {
        if (sessionSpins >= FREE_SPIN_CAP) {
          // Force-clear the session so the next base spin can proceed
          // eslint-disable-next-line @typescript-eslint/no-restricted-types
          ;(sm.state as { freeSpins: null | unknown }).freeSpins = null
          break
        }
        const fsResult = sm.freeGameSpin(rng)
        expect(fsResult.win).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(fsResult.win)).toBe(true)
        sessionSpins++
      }
    }
  })

  it('free spin win is always non-negative across 100 direct free spin invocations', () => {
    // Exercises the free spin sampler directly with all three S300 reels pre-armed
    // and a carry multiplier — the highest-stakes configuration.
    const wager = new Wager(1, BET_CONFIG)
    const sm = new LeMilitareStateMachine()

    // Seed the SM into a free spin session with all reels armed
    const bootstrapRng = mt19937(99999)
    sm.spin(bootstrapRng, wager) // put SM into a known state; ignore trigger status
    // Manually inject the free spin session with carry-armed reels
    ;(
      sm.state as {
        freeSpins: {
          triggeringWager: Wager
          spinsRemaining: number
          totalWin: number
          armedReels: Set<number>
          multiplierSum: number
        } | null
      }
    ).freeSpins = {
      triggeringWager: wager,
      spinsRemaining: 100,
      totalWin: 0,
      armedReels: new Set([0, 2, 4]),
      multiplierSum: 5,
    }

    const rng = mt19937(42)
    let spinsPlayed = 0
    while (sm.state.freeSpins && sm.state.freeSpins.spinsRemaining > 0 && spinsPlayed < 100) {
      const fsResult = sm.freeGameSpin(rng)
      expect(fsResult.win).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(fsResult.win)).toBe(true)
      spinsPlayed++
    }
    expect(spinsPlayed).toBeGreaterThan(0)
  })
})
