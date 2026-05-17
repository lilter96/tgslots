import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG, ROW_COUNT, REEL_COUNT, S300_ID, PLANE_ID } from '../constants.js'
import { makeStripChunkSampler, LE_MILITARE_SAMPLER } from '../logic.js'

// Fix 1.5: gravity refill and initial grid build draw a CONTIGUOUS CHUNK from
// the strip rather than independent per-cell draws. This preserves co-placement
// rules authored in the JSON strips and produces natural reel sequences.

describe('fix 1.5 — contiguous strip chunk sampler', () => {
  it('chunk length matches requested length', () => {
    // Build a simple synthetic strip: [A, B, C, D, E, A, B] (n=5 + 2 wrap)
    const strip = new Uint8Array([10, 20, 30, 40, 50, 10, 20])
    const sampler = makeStripChunkSampler(strip, 3)
    const rng = mt19937(1)
    for (let i = 0; i < 100; i++) {
      const chunk = sampler.sample(rng)
      expect(chunk.length).toBe(3)
    }
  })

  it('chunk symbols are consecutive entries from the strip', () => {
    // With strip [A, B, C, D, E] (n=5), any chunk of length 3 must be one of:
    // [A,B,C], [B,C,D], [C,D,E], [D,E,A], [E,A,B]
    const n = 5
    const values = [10, 20, 30, 40, 50]
    const strip = new Uint8Array([...values, values[0]!, values[1]!]) // n+2 wrap
    const sampler = makeStripChunkSampler(strip, 3)
    const rng = mt19937(42)

    for (let i = 0; i < 200; i++) {
      const chunk = sampler.sample(rng)
      // Find a start position that matches chunk[0]
      const startIdx = values.indexOf(chunk[0]!)
      expect(startIdx).toBeGreaterThanOrEqual(0)
      // chunk[1] must be the next symbol (with wrap)
      expect(chunk[1]).toBe(values[(startIdx + 1) % n])
      // chunk[2] must be two positions ahead (with wrap)
      expect(chunk[2]).toBe(values[(startIdx + 2) % n])
    }
  })

  it('chunk wraps around correctly using strip wrap-around padding', () => {
    // Strip [10, 20, 30] (n=3), ask for chunk of length 3 starting near end.
    // Position 2 should give [30, 10, 20] via modulo.
    const strip = new Uint8Array([10, 20, 30, 10, 20]) // n=3 + 2 wrap
    const sampler = makeStripChunkSampler(strip, 3)

    // Find 200 samples and verify wrap-around invariant
    const rng = mt19937(99)
    const n = 3
    const baseValues = [10, 20, 30]
    for (let i = 0; i < 200; i++) {
      const chunk = sampler.sample(rng)
      const startIdx = baseValues.indexOf(chunk[0]!)
      expect(startIdx).toBeGreaterThanOrEqual(0)
      expect(chunk[1]).toBe(baseValues[(startIdx + 1) % n])
      expect(chunk[2]).toBe(baseValues[(startIdx + 2) % n])
    }
  })

  it('chunk length 0 returns empty array without consuming RNG', () => {
    const strip = new Uint8Array([10, 20, 30, 10, 20])
    const sampler = makeStripChunkSampler(strip, 0)
    const rng1 = mt19937(7)
    const rng2 = mt19937(7)
    const chunk = sampler.sample(rng1)
    expect(chunk.length).toBe(0)
    // Consuming a chunk of length 0 should not alter RNG state compared to skipping
    // (verify both RNGs produce the same next value)
    expect(rng1(0, 100)).toBe(rng2(0, 100))
  })

  it('S300 and PLANE never appear on the same reel in any spin (base game)', () => {
    // Strips are authored so that S300-bearing reels (0,2,4) have NO PLANE symbols
    // and PLANE-bearing reels (1,3,5) have NO S300 symbols. Contiguous chunk
    // sampling preserves this: drawing from a strip that never has S300+PLANE
    // together cannot produce them together.
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    for (let seed = 0; seed < 2_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (const step of result.steps) {
        for (const grid of [step.preCombatGrid, step.postCombatGrid]) {
          for (let reel = 0; reel < REEL_COUNT; reel++) {
            let hasS300 = false
            let hasPlane = false
            for (let row = 0; row < ROW_COUNT; row++) {
              if (grid[row]![reel] === S300_ID) hasS300 = true
              if (grid[row]![reel] === PLANE_ID) hasPlane = true
            }
            expect(hasS300 && hasPlane).toBe(false)
          }
        }
      }
    }
  })
})
