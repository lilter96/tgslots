import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG, WILD_ID, PLANE_ID, ROW_COUNT, REEL_COUNT } from '../constants.js'
import { LE_MILITARE_SAMPLER } from '../logic.js'

// Strip layout: S300 exclusively on reels 0,2,4; PLANE exclusively on reels 1,3,5.
// Arming all S300 reels prevents any new activations — any shootdowns observed
// MUST come from pre-armed (carry) reels, which is exactly fix 1.1.
const ALL_S300_REELS = new Set([0, 2, 4])

function makeSampler(carryArmedReels: Set<number>) {
  return LE_MILITARE_SAMPLER(new Wager(1, BET_CONFIG), {
    isFreeSpin: true,
    carryArmedReels,
    carryMultiplierSum: 0,
  })
}

describe('fix 1.1 — pre-armed reels shoot planes without a new S300 activation', () => {
  it('carry-armed reel shoots a plane even when no new S300 appears', () => {
    // With ALL S300 reels pre-armed, newArmedReels is always empty.
    // Old buggy code would early-exit (no shootdowns). Fix must produce shootdowns.
    const sampler = makeSampler(ALL_S300_REELS)

    let preArmedShootdownFound = false
    outer: for (let seed = 0; seed < 10_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (const step of result.steps) {
        if (step.activations.length === 0 && step.shootdowns.length > 0) {
          preArmedShootdownFound = true
          // Plane cells must have become WILD
          for (const sd of step.shootdowns) {
            expect(step.postCombatGrid[sd.row]![sd.reel]).toBe(WILD_ID)
          }
          break outer
        }
      }
    }
    expect(preArmedShootdownFound).toBe(true)
  })

  it('pre-armed reels shoot planes on multiple plane-reels simultaneously', () => {
    const sampler = makeSampler(ALL_S300_REELS)

    let maxShootdownsInStep = 0
    for (let seed = 0; seed < 5_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (const step of result.steps) {
        if (step.shootdowns.length > maxShootdownsInStep) {
          maxShootdownsInStep = step.shootdowns.length
          for (const sd of step.shootdowns) {
            expect(step.postCombatGrid[sd.row]![sd.reel]).toBe(WILD_ID)
          }
        }
      }
    }
    // 3 plane reels × 5 rows = 15 possible plane positions; >1 simultaneous is expected
    expect(maxShootdownsInStep).toBeGreaterThan(1)
  })

  it('no armed reels and no S300 visible → first step has no shootdowns', () => {
    // Base spin, no carry. If first step has no activations, it had no armed reels.
    const sampler = LE_MILITARE_SAMPLER(new Wager(1, BET_CONFIG), {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    let noActivationCount = 0
    for (let seed = 0; seed < 2_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      const step0 = result.steps[0]!
      if (step0.activations.length === 0) {
        // No activation on first step with no carry = zero armed reels; no shootdowns
        expect(step0.shootdowns.length).toBe(0)
        noActivationCount++
      }
    }
    // Many base spins should have no S300 on first step
    expect(noActivationCount).toBeGreaterThan(0)
  })

  it('armed reels but no planes visible → no shootdowns, result is stable', () => {
    const sampler = makeSampler(ALL_S300_REELS)

    for (let seed = 0; seed < 3_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (const step of result.steps) {
        let planeCount = 0
        for (let row = 0; row < ROW_COUNT; row++) {
          for (let reel = 0; reel < REEL_COUNT; reel++) {
            if (step.preCombatGrid[row]![reel] === PLANE_ID) planeCount++
          }
        }
        if (planeCount === 0) {
          expect(step.shootdowns.length).toBe(0)
        }
      }
    }
  })

  it('each shootdown multiplier is drawn from the valid multiplier pool', () => {
    const sampler = makeSampler(ALL_S300_REELS)
    const validMultipliers = new Set([2, 3, 5, 10, 25, 50, 100, 500])

    for (let seed = 0; seed < 2_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (const step of result.steps) {
        for (const sd of step.shootdowns) {
          expect(validMultipliers.has(sd.multiplier)).toBe(true)
        }
      }
    }
  })
})
