import { describe, it, expect } from 'bun:test'
import { MAX_CASCADE_STEPS, ROW_COUNT, WILD_ID } from '../../constants.js'
import { createLeMilitareTestEngine } from '../test-engine.js'

// Giant armed columns persist through every cascade and every subsequent free
// spin. Individual interception WILDs are consumable; their multipliers persist.
describe('giant sticky WILD bonus', () => {
  for (const mode of ['recon', 'assault', 'siege'] as const) {
    it(`${mode}: carried columns remain WILD and never vanish through complete bonuses`, () => {
      const engine = createLeMilitareTestEngine(mode)
      let cascades = 0
      let consumedInterceptions = 0
      for (let seed = 0; seed < 300; seed++) {
        const session = engine.session({ seed })
        session.scenario('withFreeSpins', {
          armedReels: new Set([0, 2, 4]),
          spinsRemaining: 9,
          multiplierSum: 0,
        })
        let priorMultiplier = 0
        while (session.sm.state.freeSpins!.spinsRemaining > 0) {
          session.act('next')
          const result = session.sm.state.lastSpinResult!
          expect(result.steps.length).toBeLessThan(MAX_CASCADE_STEPS)
          expect(result.endMultiplierSum).toBeGreaterThanOrEqual(priorMultiplier)
          priorMultiplier = result.endMultiplierSum
          for (const step of result.steps) {
            const sticky = new Set(step.stickyWildPositions)
            const vanished = new Set(step.vanishedPositions)
            expect(sticky.size).toBe(15)
            for (const reel of [0, 2, 4]) {
              for (let row = 0; row < ROW_COUNT; row++) {
                const pos = reel * ROW_COUNT + row
                expect(step.preCombatGrid[row]![reel]).toBe(WILD_ID)
                expect(step.postCombatGrid[row]![reel]).toBe(WILD_ID)
                expect(sticky.has(pos)).toBe(true)
                expect(vanished.has(pos)).toBe(false)
              }
            }
            cascades += Number(step.hits.length > 0)
            for (const interception of step.shootdowns) {
              const pos = interception.reel * ROW_COUNT + interception.row
              expect(sticky.has(pos)).toBe(false)
              if (step.hits.some((hit) => hit.positions.includes(pos))) {
                expect(vanished.has(pos)).toBe(true)
                consumedInterceptions++
              }
            }
          }
        }
      }
      expect(cascades).toBeGreaterThan(0)
      expect(consumedInterceptions).toBeGreaterThan(0)
    })

    it(`${mode}: newly activated columns stay pinned through all later spins`, () => {
      const engine = createLeMilitareTestEngine(mode)
      let activationsChecked = 0
      for (let seed = 0; seed < 100; seed++) {
        const session = engine.session({ seed })
        session.act('buyBonus')
        const armed = new Set<number>()
        while (session.sm.state.freeSpins!.spinsRemaining > 0) {
          session.act('next')
          const result = session.sm.state.lastSpinResult!
          for (const step of result.steps) {
            for (const reel of armed) {
              for (let row = 0; row < ROW_COUNT; row++) {
                expect(step.preCombatGrid[row]![reel]).toBe(WILD_ID)
              }
            }
            for (const activation of step.activations) {
              expect(armed.has(activation.reel)).toBe(false)
              armed.add(activation.reel)
              activationsChecked++
            }
            for (const reel of armed) {
              for (let row = 0; row < ROW_COUNT; row++) {
                expect(step.postCombatGrid[row]![reel]).toBe(WILD_ID)
                expect(step.vanishedPositions.includes(reel * ROW_COUNT + row)).toBe(false)
              }
            }
          }
          expect(new Set(result.endArmedReels)).toEqual(armed)
        }
        session.act('spin')
        expect(session.sm.state.lastSpinResult!.endArmedReels).toEqual([])
      }
      expect(activationsChecked).toBeGreaterThan(0)
    })
  }
})
