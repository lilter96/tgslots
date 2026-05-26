import { describe, expect, it } from 'bun:test'
import { ROW_COUNT, DEFAULT_MODE } from '../../constants.js'
import { MODE_SAMPLERS } from '../../combat.js'
import { leMilitareTestEngine as engine } from '../test-engine.js'

const multiplierSampler = MODE_SAMPLERS[DEFAULT_MODE].multiplierSampler

describe('multiplier sampler', () => {
  it('returns values from the multiplier pool', () => {
    const rng = engine.rng(42)
    const results = new Set<number>()

    for (let i = 0; i < 1000; i++) {
      results.add(multiplierSampler.sample(rng))
    }

    for (const value of [2, 3, 5]) {
      expect(results.has(value)).toBe(true)
    }
  })

  it('produces deterministic result for a fixed seed', () => {
    const rng1 = engine.rng(99)
    const rng2 = engine.rng(99)
    expect(multiplierSampler.sample(rng1)).toBe(multiplierSampler.sample(rng2))
  })
})

describe('combat operation', () => {
  it('produces deterministic spin result for a fixed seed', () => {
    const session1 = engine.session({ seed: 12345 })
    session1.act('spin')
    const left = session1.sm.state.lastSpinResult!

    const session2 = engine.session({ seed: 12345 })
    session2.act('spin')
    const right = session2.sm.state.lastSpinResult!

    expect(left.scatterCount).toBe(right.scatterCount)
    expect(left.finalWin).toBe(right.finalWin)
    expect(left.multiplierSum).toBe(right.multiplierSum)
    expect(left.steps.length).toBe(right.steps.length)
  })

  it('returns valid result structure with required fields', () => {
    const session = engine.session({ seed: 777 })
    session.act('spin')
    const result = session.sm.state.lastSpinResult!

    expect(result.initialGrid).toBeDefined()
    expect(result.initialGrid.length).toBe(ROW_COUNT)
    expect(result.steps).toBeDefined()
    expect(typeof result.scatterCount).toBe('number')
    expect(typeof result.finalWin).toBe('number')
    expect(result.finalWin).toBeGreaterThanOrEqual(0)
    expect(typeof result.multiplierSum).toBe('number')
    expect(result.multiplierSum).toBeGreaterThanOrEqual(0)
    expect(typeof result.triggeredFreeSpins).toBe('boolean')
  })

  it('finalWin = baseClusterWin * max(1, multiplierSum) * wager.multiplier', () => {
    const session = engine.session({ seed: 9999, betLevel: 5 })

    for (let i = 0; i < 50; i++) {
      session.resetMachine()
      session.act('spin')
      const result = session.sm.state.lastSpinResult!
      const expectedMultiplier = Math.max(1, result.multiplierSum)
      const expectedWin = result.baseClusterWin * expectedMultiplier * session.wager.multiplier
      expect(result.finalWin).toBeCloseTo(expectedWin, 10)
    }
  })
})
