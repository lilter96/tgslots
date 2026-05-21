import { describe, expect, it } from 'bun:test'
import { computeLaunchPoint, computeConnectionPoint } from '../mascot/geometry.js'
import {
  LAUNCHER_HINGE_X,
  LAUNCHER_HINGE_Y,
  LAUNCHER_LEN,
  CONNECTION_ANCHOR_X,
  CONNECTION_ANCHOR_Y,
} from '../mascot/design.js'

describe('computeLaunchPoint', () => {
  it('returns tip of deployed launcher (pointing up) when isDeployed is true', () => {
    const pt = computeLaunchPoint(10, 20, true)
    expect(pt.x).toBe(10 + LAUNCHER_HINGE_X)
    expect(pt.y).toBe(20 + LAUNCHER_HINGE_Y - LAUNCHER_LEN)
  })

  it('returns tip of undeployed launcher (pointing right) when isDeployed is false', () => {
    const pt = computeLaunchPoint(10, 20, false)
    expect(pt.x).toBe(10 + LAUNCHER_HINGE_X + LAUNCHER_LEN)
    expect(pt.y).toBe(20 + LAUNCHER_HINGE_Y)
  })

  it('defaults to deployed (true)', () => {
    const deployed = computeLaunchPoint(0, 0, true)
    const defaulted = computeLaunchPoint(0, 0)
    expect(defaulted).toEqual(deployed)
  })
})

describe('computeConnectionPoint', () => {
  it('returns the hull underbody anchor point', () => {
    const pt = computeConnectionPoint(5, 15)
    expect(pt.x).toBe(5 + CONNECTION_ANCHOR_X)
    expect(pt.y).toBe(15 + CONNECTION_ANCHOR_Y)
  })
})
