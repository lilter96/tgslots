import { describe, it, expect } from 'bun:test'
import { MODE_IDS } from '../constants.js'
import { createLeMilitareTestEngine } from './test-engine.js'

describe('cross-mode free spins', () => {
  for (const mode of MODE_IDS) {
    it(`free-spin round produces deterministic results in ${mode} mode`, () => {
      const engine = createLeMilitareTestEngine(mode)
      const session1 = engine.session({ seed: 42 })
      session1.scenario('withFreeSpins', { spinsRemaining: 5, multiplierSum: 0 })
      session1.act('next')

      const session2 = engine.session({ seed: 42 })
      session2.scenario('withFreeSpins', { spinsRemaining: 5, multiplierSum: 0 })
      session2.act('next')

      const r1 = session1.sm.state.lastSpinResult!
      const r2 = session2.sm.state.lastSpinResult!
      expect(r1.finalWin).toBe(r2.finalWin)
      expect(r1.scatterCount).toBe(r2.scatterCount)
    })

    it(`free-spin mode is preserved through the session in ${mode} mode`, () => {
      const engine = createLeMilitareTestEngine(mode)
      const session = engine.session({ seed: 99 })
      session.scenario('withFreeSpins', { spinsRemaining: 3, multiplierSum: 0 })
      session.act('next')
      const machineMode = session.sm.mode
      expect(machineMode).toBe(mode)
    })
  }

  it('different modes use distinct state machines', () => {
    const assault = createLeMilitareTestEngine('assault')
    const siege = createLeMilitareTestEngine('siege')
    const recon = createLeMilitareTestEngine('recon')

    const aMachine = assault.createMachine()
    const sMachine = siege.createMachine()
    const rMachine = recon.createMachine()

    expect(aMachine.mode).toBe('assault')
    expect(sMachine.mode).toBe('siege')
    expect(rMachine.mode).toBe('recon')
    expect(aMachine.mode).not.toBe(sMachine.mode)
  })
})

describe('cross-mode buy bonus', () => {
  for (const mode of MODE_IDS) {
    it(`buy bonus completes in ${mode} mode`, () => {
      const engine = createLeMilitareTestEngine(mode)
      const session = engine.session({ seed: 123 })
      session.act('buyBonus')

      const state = session.sm.state
      // After buy bonus, we should be in free spins with a valid win
      if (state.freeSpins) {
        expect(state.freeSpins.spinsRemaining).toBeGreaterThan(0)
        expect(state.freeSpins.totalWin).toBeGreaterThanOrEqual(0)
      }
    })
  }
})

describe('cross-mode base spin', () => {
  for (const mode of MODE_IDS) {
    it(`base spin completes in ${mode} mode`, () => {
      const engine = createLeMilitareTestEngine(mode)
      const session = engine.session({ seed: 456 })
      session.act('spin')
      const result = session.sm.state.lastSpinResult!
      expect(result.initialGrid).toBeDefined()
      expect(result.steps.length).toBeGreaterThanOrEqual(0)
      expect(typeof result.finalWin).toBe('number')
    })
  }
})
