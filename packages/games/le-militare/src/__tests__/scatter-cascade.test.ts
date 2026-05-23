import { describe, it, expect } from 'bun:test'
import { SCATTER_ID, ROW_COUNT, MIN_SCATTERS, FREE_SPIN_AWARDS } from '../constants.js'
import { leMilitareTestEngine as engine } from './test-engine.js'

// scatterCount accumulates across cascade refills, not just the initial grid.
// After each refill, new scatters in refilled rows increment the running total.
// This enables retriggers from scatters that land during cascade steps.

describe('scatter accumulation across cascade refills', () => {
  it('finalScatterCount >= initial grid scatter count', () => {
    for (let seed = 0; seed < 3_000; seed++) {
      const session = engine.session({ seed })
      session.act('spin')
      const result = session.sm.state.lastSpinResult!
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
    let cascadeScatterFound = false
    for (let seed = 0; seed < 20_000 && !cascadeScatterFound; seed++) {
      const session = engine.session({ seed })
      session.act('spin')
      const result = session.sm.state.lastSpinResult!
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
    for (let seed = 0; seed < 5_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: new Set<number>(), multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      if (result.triggeredFreeSpins) {
        expect(result.scatterCount).toBeGreaterThanOrEqual(MIN_SCATTERS)
      }
    }
  })

  it('scatterCount drives freeSpinsAwarded via the awards table', () => {
    for (let seed = 0; seed < 3_000; seed++) {
      const session = engine.session({ seed })
      session.act('spin')
      const result = session.sm.state.lastSpinResult!
      if (!result.triggeredFreeSpins) continue
      const expected = FREE_SPIN_AWARDS[result.scatterCount] ?? FREE_SPIN_AWARDS[7]!
      expect(result.freeSpinsAwarded).toBe(expected)
    }
  })
})
