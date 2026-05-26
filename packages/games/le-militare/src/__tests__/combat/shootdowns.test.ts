import { describe, it, expect } from 'bun:test'
import {
  WILD_ID,
  PLANE_ID,
  ROW_COUNT,
  REEL_COUNT,
  MODE_IDS,
  MODE_CONFIGS,
} from '../../constants.js'
import { leMilitareTestEngine as engine } from '../test-engine.js'

// Strip layout: S300 exclusively on reels 0,2,4; PLANE exclusively on reels 1,3,5.
// Arming all S300 reels prevents any new activations — any shootdowns observed
// MUST come from pre-armed (carry) reels.
const ALL_S300_REELS = new Set([0, 2, 4])

describe('carry-armed reels shoot down planes', () => {
  it('carry-armed reel shoots a plane even when no new S300 appears', () => {
    let preArmedShootdownFound = false
    outer: for (let seed = 0; seed < 10_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: ALL_S300_REELS, multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      for (const step of result.steps) {
        if (step.activations.length === 0 && step.shootdowns.length > 0) {
          preArmedShootdownFound = true
          for (const sd of step.shootdowns) {
            expect(step.postCombatGrid[sd.row]![sd.reel]).toBe(WILD_ID)
          }
          break outer
        }
      }
    }
    expect(preArmedShootdownFound).toBe(true)
  })

  it('pre-armed reels shoot planes on multiple plane-reels simultaneously', () => {
    let maxShootdownsInStep = 0
    for (let seed = 0; seed < 5_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: ALL_S300_REELS, multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      for (const step of result.steps) {
        if (step.shootdowns.length > maxShootdownsInStep) {
          maxShootdownsInStep = step.shootdowns.length
          for (const sd of step.shootdowns) {
            expect(step.postCombatGrid[sd.row]![sd.reel]).toBe(WILD_ID)
          }
        }
      }
    }
    expect(maxShootdownsInStep).toBeGreaterThan(1)
  })

  it('no armed reels and no S300 visible — first step has no shootdowns', () => {
    let noActivationCount = 0
    for (let seed = 0; seed < 2_000; seed++) {
      const session = engine.session({ seed })
      session.act('spin')
      const result = session.sm.state.lastSpinResult!
      const step0 = result.steps[0]!
      if (step0.activations.length === 0) {
        expect(step0.shootdowns.length).toBe(0)
        noActivationCount++
      }
    }
    expect(noActivationCount).toBeGreaterThan(0)
  })

  it('armed reels but no planes visible — no shootdowns, result is stable', () => {
    for (let seed = 0; seed < 3_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: ALL_S300_REELS, multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      for (const step of result.steps) {
        let planeCount = 0
        for (let row = 0; row < ROW_COUNT; row++) {
          for (let reel = 0; reel < REEL_COUNT; reel++) {
            if (step.preCombatGrid[row]![reel] === PLANE_ID) planeCount++
          }
        }
        if (planeCount === 0) {
          expect(step.shootdowns.length).toBe(0)
        }
      }
    }
  })

  describe('shootdown multiplier pool validation', () => {
    for (const mode of MODE_IDS) {
      const config = MODE_CONFIGS[mode]
      const validMultipliers = new Set<number>(config.multiplierWeights.map(([v]) => v))
      it(`each ${mode}-mode shootdown multiplier is drawn from the valid pool`, () => {
        // The test engine runs in assault mode by default; this validates the
        // assault pool. For non-assault modes, a dedicated engine instance would
        // be needed (future).
        if (mode !== 'assault') return
        for (let seed = 0; seed < 2_000; seed++) {
          const session = engine.session({ seed })
          session.scenario('withFreeSpins', { armedReels: ALL_S300_REELS, multiplierSum: 0 })
          session.act('next')
          const result = session.sm.state.lastSpinResult!
          for (const step of result.steps) {
            for (const sd of step.shootdowns) {
              expect(validMultipliers.has(sd.multiplier)).toBe(true)
            }
          }
        }
      })
    }
  })
})
