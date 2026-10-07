import { describe, it, expect } from 'bun:test'
import { WILD_ID, ROW_COUNT } from '../../constants.js'
import { leMilitareTestEngine as engine } from '../test-engine.js'

// S300-only reels: 0, 2, 4. PLANE-only reels: 1, 3, 5.

describe('newly armed reels become wild', () => {
  it('carry-armed reels are fully WILD on the initial pre-combat grid', () => {
    for (let seed = 0; seed < 500; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: new Set([0, 2, 4]), multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      const preCombat = result.steps[0]!.preCombatGrid
      for (const reel of [0, 2, 4]) {
        for (let row = 0; row < ROW_COUNT; row++) {
          expect(preCombat[row]![reel]).toBe(WILD_ID)
        }
      }
    }
  })

  it('partial carry-armed set paints exactly those reels WILD and leaves others unchanged', () => {
    const carryArmedReels = new Set([0])
    for (let seed = 0; seed < 500; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins', { armedReels: carryArmedReels, multiplierSum: 0 })
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      const preCombat = result.steps[0]!.preCombatGrid
      for (let row = 0; row < ROW_COUNT; row++) {
        expect(preCombat[row]![0]).toBe(WILD_ID)
      }
    }
  })

  it('emits exactly one ActivationEvent per reel per step', () => {
    for (let seed = 0; seed < 3_000; seed++) {
      const session = engine.session({ seed })
      session.scenario('withFreeSpins')
      session.act('next')
      const result = session.sm.state.lastSpinResult!
      for (const step of result.steps) {
        const activatedReels = step.activations.map((a) => a.reel)
        const unique = new Set(activatedReels)
        expect(unique.size).toBe(activatedReels.length)
      }
    }
  })
})
