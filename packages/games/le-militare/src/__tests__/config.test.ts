import { describe, expect, it } from 'bun:test'
import { BUY_OPTIONS, FREE_SPIN_AWARDS, GRID_AREA, MIN_SCATTERS } from '../constants.js'

describe('Le Militare config validation', () => {
  it('BUY_OPTIONS tiers have minScatters <= GRID_AREA', () => {
    for (const [name, tier] of Object.entries(BUY_OPTIONS)) {
      if (!('minScatters' in tier)) continue
      expect(
        tier.minScatters,
        `Buy tier "${name}" minScatters=${tier.minScatters} exceeds GRID_AREA=${GRID_AREA}`,
      ).toBeLessThanOrEqual(GRID_AREA)
    }
  })

  it('FREE_SPIN_AWARDS keys do not exceed GRID_AREA', () => {
    for (const key of Object.keys(FREE_SPIN_AWARDS)) {
      const count = Number(key)
      expect(
        count,
        `FREE_SPIN_AWARDS key ${count} exceeds GRID_AREA=${GRID_AREA}`,
      ).toBeLessThanOrEqual(GRID_AREA)
    }
  })

  it('MIN_SCATTERS is <= GRID_AREA', () => {
    expect(MIN_SCATTERS).toBeLessThanOrEqual(GRID_AREA)
  })
})
