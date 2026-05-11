import { describe, expect, it } from 'bun:test'
import { SpinSpeedController, getSpinSpeedProfile } from '../spin-speed'

describe('SpinSpeedController', () => {
  it('defaults to normal mode', () => {
    const controller = new SpinSpeedController()

    expect(controller.mode).toBe('normal')
    expect(controller.state.fastEnabled).toBe(false)
    expect(controller.state.turboEnabled).toBe(false)
  })

  it('toggles fast mode on and off', () => {
    const controller = new SpinSpeedController()

    controller.toggleFast()
    expect(controller.mode).toBe('fast')

    controller.toggleFast()
    expect(controller.mode).toBe('normal')
  })

  it('makes turbo exclusive with fast', () => {
    const controller = new SpinSpeedController()

    controller.toggleFast()
    controller.toggleTurbo()
    expect(controller.mode).toBe('turbo')

    controller.toggleTurbo()
    expect(controller.mode).toBe('normal')
  })

  it('exposes progressively shorter auto-spin delays', () => {
    expect(getSpinSpeedProfile('fast').autoSpinDelayMs).toBeLessThan(
      getSpinSpeedProfile('normal').autoSpinDelayMs,
    )
    expect(getSpinSpeedProfile('turbo').autoSpinDelayMs).toBeLessThan(
      getSpinSpeedProfile('fast').autoSpinDelayMs,
    )
  })
})
