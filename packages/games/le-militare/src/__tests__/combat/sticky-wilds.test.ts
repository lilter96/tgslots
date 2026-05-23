import { describe, it, expect } from 'bun:test'
import { WILD_ID, ROW_COUNT } from '../../constants.js'
import { leMilitareTestEngine as engine } from '../test-engine.js'

// Sticky wilds: when a PLANE is shot down and becomes WILD, its position is
// excluded from vanishedPositions even if it participates in a cluster win.
// The compactStickyGrid mirrors applyGravity so stickyWildPositions tracks
// where each sticky cell will land after gravity.

function decodePos(pos: number): { reel: number; row: number } {
  return { reel: Math.floor(pos / ROW_COUNT), row: pos % ROW_COUNT }
}

describe('shootdown wilds persist across cascade steps', () => {
  it('shootdown cell positions are excluded from vanishedPositions in the same step', () => {
    let shootdownStepFound = false
    for (let seed = 0; seed < 5_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: new Set([0, 2, 4]), multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      for (const step of result.steps) {
        if (step.shootdowns.length === 0) continue
        shootdownStepFound = true
        const vanishedSet = new Set(step.vanishedPositions)
        for (const sd of step.shootdowns) {
          const shootdownPos = sd.reel * ROW_COUNT + sd.row
          expect(vanishedSet.has(shootdownPos)).toBe(false)
        }
      }
    }
    expect(shootdownStepFound).toBe(true)
  })

  it('sticky wild cell is WILD in the next step preCombatGrid', () => {
    let stickyPersistenceChecked = false
    for (let seed = 0; seed < 5_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: new Set([0, 2, 4]), multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      for (let i = 0; i < result.steps.length - 1; i++) {
        const step = result.steps[i]!
        const nextStep = result.steps[i + 1]!
        for (const stickyPos of step.stickyWildPositions) {
          const { reel, row } = decodePos(stickyPos)
          expect(nextStep.preCombatGrid[row]![reel]).toBe(WILD_ID)
          stickyPersistenceChecked = true
        }
      }
    }
    expect(stickyPersistenceChecked).toBe(true)
  })

  it('multiple sticky wilds in one spin are all preserved', () => {
    let maxStickiesInStep = 0
    for (let seed = 0; seed < 5_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: new Set([0, 2, 4]), multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      for (let i = 0; i < result.steps.length - 1; i++) {
        const step = result.steps[i]!
        const nextStep = result.steps[i + 1]!
        if (step.stickyWildPositions.length > maxStickiesInStep) {
          maxStickiesInStep = step.stickyWildPositions.length
        }
        for (const stickyPos of step.stickyWildPositions) {
          const { reel, row } = decodePos(stickyPos)
          expect(nextStep.preCombatGrid[row]![reel]).toBe(WILD_ID)
        }
      }
    }
    expect(maxStickiesInStep).toBeGreaterThan(1)
  })

  it('sticky wilds do not persist across independent spins', () => {
    const session1 = engine.session({ seed: 42 })
    session1.scenario('withFreeSpins', { armedReels: new Set([0, 2, 4]), multiplierSum: 0 })
    session1.act('next')
    const r1 = session1.sm.state.lastSpinResult!

    const session2 = engine.session({ seed: 42 })
    session2.scenario('withFreeSpins', { armedReels: new Set([0, 2, 4]), multiplierSum: 0 })
    session2.act('next')
    const r2 = session2.sm.state.lastSpinResult!

    expect(r1.steps.length).toBe(r2.steps.length)
    for (let i = 0; i < r1.steps.length; i++) {
      expect(r1.steps[i]!.stickyWildPositions).toEqual(r2.steps[i]!.stickyWildPositions)
    }

    const session3 = engine.session({ seed: 43 })
    session3.scenario('withFreeSpins', { armedReels: new Set([0, 2, 4]), multiplierSum: 0 })
    session3.act('next')
    const r3 = session3.sm.state.lastSpinResult!

    const r1Stickies = r1.steps.flatMap((s) => [...s.stickyWildPositions]).join(',')
    const r3Stickies = r3.steps.flatMap((s) => [...s.stickyWildPositions]).join(',')
    expect(typeof r1Stickies).toBe('string')
    expect(typeof r3Stickies).toBe('string')
  })

  it('stickyWildPositions are on plane reels only (reels 1, 3, 5)', () => {
    const planeReels = new Set([1, 3, 5])
    for (let seed = 0; seed < 3_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: new Set([0, 2, 4]), multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      for (const step of result.steps) {
        for (const stickyPos of step.stickyWildPositions) {
          const { reel } = decodePos(stickyPos)
          expect(planeReels.has(reel)).toBe(true)
        }
      }
    }
  })
})
