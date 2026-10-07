import { describe, expect, it } from 'bun:test'
import { MultiplierHud } from '../multiplier-hud.js'

describe('MultiplierHud', () => {
  it('initializes with ×1', () => {
    const hud = new MultiplierHud()
    expect(hud).toBeDefined()
    hud.destroy({ children: true })
  })

  it('setValue updates the display text', () => {
    const hud = new MultiplierHud()
    // Access private _value via type cast to verify
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const h = hud as unknown as Record<string, unknown>
    const valueText = h['_value'] as { text: string }

    hud.setValue(5)
    expect(valueText.text).toBe('×5')

    hud.setValue(100)
    expect(valueText.text).toBe('×100')

    hud.destroy({ children: true })
  })

  it('setValue clamps to minimum 1', () => {
    const hud = new MultiplierHud()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const h = hud as unknown as Record<string, unknown>
    const valueText = h['_value'] as { text: string }

    hud.setValue(0)
    expect(valueText.text).toBe('×1')

    hud.setValue(-5)
    expect(valueText.text).toBe('×1')

    hud.destroy({ children: true })
  })

  it('setValue rounds non-integer values', () => {
    const hud = new MultiplierHud()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const h = hud as unknown as Record<string, unknown>
    const valueText = h['_value'] as { text: string }

    hud.setValue(3.7)
    expect(valueText.text).toBe('×4')

    hud.setValue(NaN)
    expect(valueText.text).toBe('×1')

    hud.destroy({ children: true })
  })

  it('setValue is idempotent for same value', () => {
    const hud = new MultiplierHud()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const h = hud as unknown as Record<string, unknown>

    hud.setValue(5)
    const prevCurrent = h['_currentValue'] as number
    hud.setValue(5)
    expect(h['_currentValue']).toBe(prevCurrent)

    hud.destroy({ children: true })
  })

  it('destroy cleans up GSAP tweens', () => {
    const hud = new MultiplierHud()
    hud.setValue(10)
    // Should not throw
    hud.destroy({ children: true })
  })
})

it('keeps its responsive scale while the multiplier pulse animates', async () => {
  const { gsap } = await import('gsap')
  const hud = new MultiplierHud()
  hud.scale.set(0.45)
  hud.setValue(25)
  // Advance this HUD's actual pulse, as the browser ticker would.
  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  const h = hud as unknown as Record<string, unknown>
  const content = h['_content'] as { scale: { x: number; y: number } }
  const pulse = gsap.getTweensOf(content.scale)[0]!
  pulse.progress(0.5)
  expect(content.scale.x).toBeGreaterThan(1)
  expect(hud.scale.x).toBe(0.45)
  expect(hud.scale.y).toBe(0.45)
  hud.destroy({ children: true })
})
