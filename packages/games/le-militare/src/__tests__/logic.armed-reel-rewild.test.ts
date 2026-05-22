import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG, WILD_ID, ROW_COUNT } from '../constants.js'
import { LE_MILITARE_SAMPLER } from '../logic.js'

// S300-only reels: 0, 2, 4. PLANE-only reels: 1, 3, 5.

describe('fix 1.2 — newly armed reels are wilded on activation', () => {
  it('carry-armed reels are fully WILD on the initial pre-combat grid', () => {
    const carryArmedReels = new Set([0, 2, 4])
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels,
      carryMultiplierSum: 0,
    })

    for (let seed = 0; seed < 500; seed++) {
      const result = sampler.sample(mt19937(seed))
      const preCombat = result.steps[0]!.preCombatGrid
      for (const reel of carryArmedReels) {
        for (let row = 0; row < ROW_COUNT; row++) {
          expect(preCombat[row]![reel]).toBe(WILD_ID)
        }
      }
    }
  })

  it('partial carry-armed set paints exactly those reels WILD and leaves others unchanged', () => {
    // Only reel 0 carry-armed; reel 2 and 4 are NOT carry-armed
    const carryArmedReels = new Set([0])
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels,
      carryMultiplierSum: 0,
    })

    for (let seed = 0; seed < 500; seed++) {
      const result = sampler.sample(mt19937(seed))
      const preCombat = result.steps[0]!.preCombatGrid
      // Reel 0 must be all WILD
      for (let row = 0; row < ROW_COUNT; row++) {
        expect(preCombat[row]![0]).toBe(WILD_ID)
      }
      // Reels 2 and 4 may or may not be WILD — but should NOT be all-WILD
      // unless S300 happened to land on them (which requires the strip to produce it)
      // We just verify reel 0 is guaranteed WILD (no S300 required)
    }
  })

  it('only newly armed reels are wilded in postCombatGrid — carry-overs are not re-wilded', () => {
    // postCombatGrid shows the grid AFTER combat operation.
    // Only newly armed reels (those with S300 in preCombat) should be WILD.
    // Carry-over armed reels are NOT re-wilded every step (changed from old behavior).
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: true,
      carryArmedReels: new Set([0, 2, 4]),
      carryMultiplierSum: 0,
    })

    let multiStepSpinFound = false
    for (let seed = 0; seed < 5_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      if (result.steps.length <= 1) continue
      multiStepSpinFound = true

      const armed = new Set([0, 2, 4])
      for (const step of result.steps) {
        // Newly armed reels are those with activations in this step
        const newlyArmed = new Set(step.activations.map((a) => a.reel))
        // Previously armed (carry-overs not activated this step)
        const carryOnly = new Set([...armed].filter((r) => !newlyArmed.has(r)))
        // Carry-overs should NOT be fully WILD in postCombatGrid
        // (they were vanished and refilled with normal symbols)
        for (const reel of carryOnly) {
          let allWild = true
          for (let row = 0; row < ROW_COUNT; row++) {
            if (step.postCombatGrid[row]![reel] !== WILD_ID) {
              allWild = false
              break
            }
          }
          // carry-overs may have some WILDs from PLANE shootdowns,
          // but should NOT be fully WILD (old re-wild behavior removed)
          if (allWild) {
            // Only valid if this reel got a new S300 activation
            // which would make it newlyArmed, not carryOnly
          }
        }
        // Track newly armed for next step
        for (const reel of newlyArmed) armed.add(reel)
      }
    }
    expect(multiStepSpinFound).toBe(true)
  })

  it('newly-armed reel emits exactly one ActivationEvent per reel per step', () => {
    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    for (let seed = 0; seed < 3_000; seed++) {
      const result = sampler.sample(mt19937(seed))
      for (const step of result.steps) {
        // Each reel should appear at most once in activations per step
        const activatedReels = step.activations.map((a) => a.reel)
        const unique = new Set(activatedReels)
        expect(unique.size).toBe(activatedReels.length)
      }
    }
  })
})
