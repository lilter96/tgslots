import { describe, expect, it } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { ROW_COUNT } from '../constants.js'
import { multiplierSampler } from '../logic.js'
import type { LeMilitareFreeResult } from '../game-state-machine.js'
import { leMilitareTestEngine as engine } from './test-engine.js'

describe('multiplierSampler', () => {
  it('returns values from the multiplier pool', () => {
    const rng = mt19937(42)
    const results = new Set<number>()

    for (let i = 0; i < 1000; i++) {
      results.add(multiplierSampler.sample(rng))
    }

    for (const value of [2, 3, 5]) {
      expect(results.has(value)).toBe(true)
    }
  })

  it('produces deterministic result for a fixed seed', () => {
    const rng1 = mt19937(99)
    const rng2 = mt19937(99)
    expect(multiplierSampler.sample(rng1)).toBe(multiplierSampler.sample(rng2))
  })
})

describe('combat operation integration via LE_MILITARE_SAMPLER', () => {
  it('produces deterministic spin result for a fixed seed', async () => {
    const { LE_MILITARE_SAMPLER } = await import('../logic.js')
    const { Wager } = await import('@tgslots/slots-core/betting')
    const { BET_CONFIG } = await import('../constants.js')

    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    const rng1 = mt19937(12345)
    const rng2 = mt19937(12345)
    const left = sampler.sample(rng1)
    const right = sampler.sample(rng2)

    expect(left.scatterCount).toBe(right.scatterCount)
    expect(left.finalWin).toBe(right.finalWin)
    expect(left.multiplierSum).toBe(right.multiplierSum)
    expect(left.steps.length).toBe(right.steps.length)
  })

  it('returns valid result structure with required fields', async () => {
    const { LE_MILITARE_SAMPLER } = await import('../logic.js')
    const { Wager } = await import('@tgslots/slots-core/betting')
    const { BET_CONFIG } = await import('../constants.js')

    const wager = new Wager(1, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    const result = sampler.sample(mt19937(777))
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

  it('finalWin = baseClusterWin * max(1, multiplierSum) * wager.multiplier', async () => {
    const { LE_MILITARE_SAMPLER } = await import('../logic.js')
    const { Wager } = await import('@tgslots/slots-core/betting')
    const { BET_CONFIG } = await import('../constants.js')

    const wager = new Wager(5, BET_CONFIG)
    const sampler = LE_MILITARE_SAMPLER(wager, {
      isFreeSpin: false,
      carryArmedReels: new Set(),
      carryMultiplierSum: 0,
    })

    const rng = mt19937(9999)
    for (let i = 0; i < 50; i++) {
      const result = sampler.sample(rng)
      const expectedMultiplier = Math.max(1, result.multiplierSum)
      const expectedWin = result.baseClusterWin * expectedMultiplier * wager.multiplier
      expect(result.finalWin).toBeCloseTo(expectedWin, 10)
    }
  })
})

describe('LeMilitareStateMachine', () => {
  it('spin returns BASE result and updates state', () => {
    const session = engine.session({ seed: 1 })
    const result = session.act('spin')

    expect(result.type).toBe('BASE')
    expect(typeof result.win).toBe('number')
    expect(result.win).toBeGreaterThanOrEqual(0)
  })

  it('free spin returns FREE result when free spins are active', () => {
    const session = engine.session({ seed: 7919 })
    session.scenario('withFreeSpins', { spinsRemaining: 1 })

    const result = session.act('next') as LeMilitareFreeResult | null
    expect(result?.type).toBe('FREE')
    expect(typeof result?.win).toBe('number')
  })

  it('next() returns null when no free spins are active', () => {
    const session = engine.session({ seed: 42 })
    session.act('spin')

    if (!session.sm.state.freeSpins) {
      expect(session.act('next')).toBeNull()
    }
  })
})
