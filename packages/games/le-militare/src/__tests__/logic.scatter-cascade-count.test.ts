import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG, SCATTER_ID, ROW_COUNT, MIN_SCATTERS } from '../constants.js'
import { LE_MILITARE_SAMPLER } from '../logic.js'

// Fix 1.4: scatterCount accumulates across cascade refills, not just the initial grid.
// After each refill, new scatters in refilled rows increment the running total.
// This enables retriggers from scatters that land during cascade steps.

describe('fix 1.4 — scatters counted across all cascade refills', () => {
  it('finalScatterCount >= initial grid scatter count', () => {
    // The accumulated count can only grow — scatters on initial grid plus refill scatters.
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    for (let seed = 0; seed < 3_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      // Count scatters on the initial grid (first step preCombatGrid before any combat)
      const firstGrid = result.initialGrid
      let initialScatters = 0
      for (let row = 0; row < ROW_COUNT; row++) {
        for (let col = 0; col < 6; col++) {
          if (firstGrid[row]![col] === SCATTER_ID) initialScatters++
        }
      }
      expect(result.scatterCount).toBeGreaterThanOrEqual(initialScatters)
    }
  })

  it('scatters that land during cascade refills increment the final count', () => {
    // Run many multi-step cascades; in at least some, refills drop scatters.
    // We detect this when result.scatterCount > scatters-on-initial-grid.
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    let cascadeScatterFound = false
    for (let seed = 0; seed < 20_000 && !cascadeScatterFound; seed++) {
      const result = sampler.sample(mt19937(seed))
      if (result.steps.length <= 1) continue

      const firstGrid = result.initialGrid
      let initialScatters = 0
      for (let row = 0; row < ROW_COUNT; row++) {
        for (let col = 0; col < 6; col++) {
          if (firstGrid[row]![col] === SCATTER_ID) initialScatters++
        }
      }

      if (result.scatterCount > initialScatters) {
        cascadeScatterFound = true
      }
    }
    expect(cascadeScatterFound).toBe(true)
  })

  it('retrigger in free spin respects cascade-accumulated scatter count', () => {
    // Free spins use strips with more scatters. Find a free spin where
    // triggeredFreeSpins is true and scatterCount >= MIN_SCATTERS.
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    for (let seed = 0; seed < 5_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      if (result.triggeredFreeSpins) {
        expect(result.scatterCount).toBeGreaterThanOrEqual(MIN_SCATTERS)
      }
    }
  })

  it('scatterCount drives freeSpinsAwarded via the awards table', () => {
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    const awardTable: Record<number, number> = { 4: 10, 5: 15, 6: 20, 7: 25 }

    for (let seed = 0; seed < 3_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      if (!result.triggeredFreeSpins) continue
      const expected = awardTable[result.scatterCount] ?? awardTable[7]!
      expect(result.freeSpinsAwarded).toBe(expected)
    }
  })
})
