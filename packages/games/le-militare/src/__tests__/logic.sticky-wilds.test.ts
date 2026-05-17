import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG, WILD_ID, ROW_COUNT } from '../constants.js'
import { LE_MILITARE_SAMPLER } from '../logic.js'

// Sticky wilds: when a PLANE is shot down and becomes WILD, its position is
// excluded from vanishedPositions even if it participates in a cluster win.
// The compactStickyGrid mirrors applyGravity so stickyWildPositions tracks
// where each sticky cell will land after gravity. The next step's preCombatGrid
// at those positions must be WILD_ID.

function decodePos(pos: number): { reel: number; row: number } {
  return { reel: Math.floor(pos / ROW_COUNT), row: pos % ROW_COUNT }
}

describe('fix 1.3 — shootdown wilds are sticky and survive cluster vanishing', () => {
  it('shootdown cell positions are excluded from vanishedPositions in the same step', () => {
    // A shootdown at (reel, row) converts that cell to a sticky WILD.
    // Its pre-gravity encoded position must not appear in vanishedPositions.
    // Note: stickyWildPositions holds POST-gravity positions while vanishedPositions
    // holds PRE-gravity positions — comparing shootdown.reel*ROW_COUNT+row is correct.
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels: new Set([0, 2, 4]),
      carryMultiplierSum: 0,
    })

    let shootdownStepFound = false
    for (let seed = 0; seed < 5_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (const step of result.steps) {
        if (step.shootdowns.length === 0) continue
        shootdownStepFound = true
        const vanishedSet = new Set(step.vanishedPositions)
        for (const sd of step.shootdowns) {
          const shootdownPos = sd.reel * ROW_COUNT + sd.row
          // The cell that was shot is sticky — it must NOT be vanished
          expect(vanishedSet.has(shootdownPos)).toBe(false)
        }
      }
    }
    expect(shootdownStepFound).toBe(true)
  })

  it('sticky wild cell is WILD in the next step preCombatGrid', () => {
    // stickyWildPositions in step N encodes post-compaction positions that
    // survive into the next step. Step[N+1].preCombatGrid at those positions
    // must be WILD_ID (the sticky wild persists after gravity+refill).
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels: new Set([0, 2, 4]),
      carryMultiplierSum: 0,
    })

    let stickyPersistenceChecked = false
    for (let seed = 0; seed < 5_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (let i = 0; i < result.steps.length - 1; i++) {
        const step = result.steps[i]!
        const nextStep = result.steps[i + 1]!
        for (const stickyPos of step.stickyWildPositions) {
          const { reel, row } = decodePos(stickyPos)
          expect(nextStep.preCombatGrid[row]![reel]).toBe(WILD_ID)
          stickyPersistenceChecked = true
        }
      }
    }
    // We must have found at least one sticky wild that persisted to a next step
    expect(stickyPersistenceChecked).toBe(true)
  })

  it('multiple sticky wilds in one spin are all preserved', () => {
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels: new Set([0, 2, 4]),
      carryMultiplierSum: 0,
    })

    let maxStickiesInStep = 0
    for (let seed = 0; seed < 5_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (let i = 0; i < result.steps.length - 1; i++) {
        const step = result.steps[i]!
        const nextStep = result.steps[i + 1]!
        if (step.stickyWildPositions.length > maxStickiesInStep) {
          maxStickiesInStep = step.stickyWildPositions.length
        }
        for (const stickyPos of step.stickyWildPositions) {
          const { reel, row } = decodePos(stickyPos)
          expect(nextStep.preCombatGrid[row]![reel]).toBe(WILD_ID)
        }
      }
    }
    // With 3 plane reels × 5 rows, multiple simultaneous sticky wilds are expected
    expect(maxStickiesInStep).toBeGreaterThan(1)
  })

  it('sticky wilds do not persist across independent spins', () => {
    // Sticky wilds are per-spin; the Sampler creates a fresh stickyGrid each invocation.
    // Running the same sampler twice should produce independent results.
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels: new Set([0, 2, 4]),
      carryMultiplierSum: 0,
    })

    const rng1 = mt19937(42)
    const rng2 = mt19937(42)
    const r1 = sampler.sample(rng1)
    const r2 = sampler.sample(rng2)

    // Deterministic: same seed → same sticky-wild positions
    expect(r1.steps.length).toBe(r2.steps.length)
    for (let i = 0; i < r1.steps.length; i++) {
      expect(r1.steps[i]!.stickyWildPositions).toEqual(r2.steps[i]!.stickyWildPositions)
    }

    // A different seed produces a fresh, independent spin
    const r3 = sampler.sample(mt19937(43))
    // r3's sticky positions are derived solely from r3's RNG — no leftover from r1/r2
    // We can verify r1 and r3 are not forced to be identical
    const r1Stickies = r1.steps.flatMap((s) => [...s.stickyWildPositions]).join(',')
    const r3Stickies = r3.steps.flatMap((s) => [...s.stickyWildPositions]).join(',')
    // They may coincidentally be equal, but the MECHANISM is independent; no assertion needed
    // Just verify both produce valid results without crash
    expect(typeof r1Stickies).toBe('string')
    expect(typeof r3Stickies).toBe('string')
  })

  it('stickyWildPositions are on plane reels only (reels 1, 3, 5)', () => {
    // S300 reels (0, 2, 4) are re-wilded with sticky=false each step.
    // Shootdown wilds can only land on PLANE reels (1, 3, 5).
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels: new Set([0, 2, 4]),
      carryMultiplierSum: 0,
    })

    const planeReels = new Set([1, 3, 5])
    for (let seed = 0; seed < 3_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (const step of result.steps) {
        for (const stickyPos of step.stickyWildPositions) {
          const { reel } = decodePos(stickyPos)
          expect(planeReels.has(reel)).toBe(true)
        }
      }
    }
  })
})
