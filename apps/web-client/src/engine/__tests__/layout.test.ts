import { describe, expect, it } from 'bun:test'
import { getResponsiveLayout } from '../layout'

interface ViewportCase {
  width: number
  height: number
  mode: 'wide' | 'compact' | 'portrait'
  viewportClass: 'phone' | 'tablet' | 'desktop'
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

const CASES: ViewportCase[] = [
  { width: 390, height: 844, mode: 'portrait', viewportClass: 'phone' },
  { width: 844, height: 390, mode: 'compact', viewportClass: 'phone' },
  { width: 768, height: 1024, mode: 'portrait', viewportClass: 'tablet' },
  { width: 1180, height: 820, mode: 'compact', viewportClass: 'tablet' },
  { width: 1366, height: 768, mode: 'wide', viewportClass: 'desktop' },
  { width: 1920, height: 1080, mode: 'wide', viewportClass: 'desktop' },
]

describe('responsive layout snapshot', () => {
  for (const { width, height, mode, viewportClass } of CASES) {
    it(`builds a non-overlapping layout for ${width}x${height}`, () => {
      const layout = getResponsiveLayout(width, height)

      expect(layout.hudMode).toBe(mode)
      expect(layout.viewportClass).toBe(viewportClass)

      expect(layout.reelBounds.x).toBeGreaterThanOrEqual(layout.gameplayArea.x)
      expect(layout.reelBounds.y).toBeGreaterThanOrEqual(layout.gameplayArea.y)
      expect(layout.reelBounds.x + layout.reelBounds.width).toBeLessThanOrEqual(
        layout.gameplayArea.x + layout.gameplayArea.width,
      )
      expect(layout.reelBounds.y + layout.reelBounds.height).toBeLessThanOrEqual(
        layout.gameplayArea.y + layout.gameplayArea.height,
      )

      expect(intersects(layout.reelBounds, layout.infoArea)).toBe(false)
      expect(intersects(layout.reelBounds, layout.controlsArea)).toBe(false)
      expect(intersects(layout.infoArea, layout.controlsArea)).toBe(false)
      expect(layout.controlsArea.y + layout.controlsArea.height).toBe(height - layout.safePadding)
      expect(layout.infoArea.y + layout.infoArea.height + layout.gutter).toBe(layout.controlsArea.y)
      expect(layout.infoArea.y).toBeGreaterThanOrEqual(layout.gameplayArea.y + layout.gameplayArea.height)

      expect(layout.modalBounds.x).toBeGreaterThanOrEqual(0)
      expect(layout.modalBounds.y).toBeGreaterThanOrEqual(0)
      expect(layout.modalBounds.x + layout.modalBounds.width).toBeLessThanOrEqual(width)
      expect(layout.modalBounds.y + layout.modalBounds.height).toBeLessThanOrEqual(height)

      expect(layout.featureBounds.x).toBeGreaterThanOrEqual(0)
      expect(layout.featureBounds.y).toBeGreaterThanOrEqual(0)
      expect(layout.featureBounds.x + layout.featureBounds.width).toBeLessThanOrEqual(width)
      expect(layout.featureBounds.y + layout.featureBounds.height).toBeLessThanOrEqual(height)
    })
  }
})
