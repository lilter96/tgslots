import { describe, expect, test } from 'bun:test'
import { getFeatureMenuLayout } from '../helpers/feature-menu-layout.js'

describe('responsive feature menu', () => {
  for (const [width, height] of [
    [390, 844],
    [360, 780],
    [320, 740],
  ]) {
    test(`keeps phone choices within ${width}x${height} and preserves touch targets`, () => {
      const layout = getFeatureMenuLayout(width!, height! - 52)
      expect(layout.columns).toBe(2)
      expect(layout.panelWidth * layout.scale).toBeLessThanOrEqual(width! - 24)
      expect(layout.panelHeight * layout.scale).toBeLessThanOrEqual(height! - 76)
      expect(44 * layout.scale).toBeGreaterThanOrEqual(44)
    })
  }
  test('uses five columns on desktop and compact landscape', () => {
    expect(getFeatureMenuLayout(1280, 720).columns).toBe(5)
    expect(getFeatureMenuLayout(844, 390).columns).toBe(5)
  })
})
