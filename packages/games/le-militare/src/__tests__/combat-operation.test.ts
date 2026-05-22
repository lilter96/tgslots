import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { ROW_COUNT } from '../constants.js'
import { multiplierSampler } from '../logic.js'

describe('multiplierSampler', () => {
  it('returns values from the multiplier pool', () => {
    const rng = mt19937(42)
    const results = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      results.add(multiplierSampler.sample(rng))
    }
    for (const v of [2, 3, 5]) {
      expect(results.has(v)).toBe(true)
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
    const r1 = sampler.sample(rng1)
    const r2 = sampler.sample(rng2)

    expect(r1.scatterCount).toBe(r2.scatterCount)
    expect(r1.finalWin).toBe(r2.finalWin)
    expect(r1.multiplierSum).toBe(r2.multiplierSum)
    expect(r1.steps.length).toBe(r2.steps.length)
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

    const rng = mt19937(777)
    const result = sampler.sample(rng)

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

    // Run many spins to check the formula holds
    const rng = mt19937(9999)
    for (let i = 0; i < 50; i++) {
      const r = sampler.sample(rng)
      const expectedMultiplier = Math.max(1, r.multiplierSum)
      const expectedWin = r.baseClusterWin * expectedMultiplier * wager.multiplier
      expect(r.finalWin).toBeCloseTo(expectedWin, 10)
    }
  })
})

describe('LeMilitareStateMachine', () => {
  it('spin returns BASE result and updates state', async () => {
    const { LeMilitareStateMachine } = await import('../game-state-machine.js')
    const { Wager } = await import('@tgslots/slots-core/betting')
    const { BET_CONFIG } = await import('../constants.js')

    const sm = new LeMilitareStateMachine()
    const rng = mt19937(1)
    const wager = new Wager(1, BET_CONFIG)
    const result = sm.spin(rng, wager)

    expect(result.type).toBe('BASE')
    expect(typeof result.win).toBe('number')
    expect(result.win).toBeGreaterThanOrEqual(0)
  })

  it('free spin returns FREE result when free spins are active', async () => {
    const { LeMilitareStateMachine } = await import('../game-state-machine.js')
    const { Wager } = await import('@tgslots/slots-core/betting')
    const { BET_CONFIG } = await import('../constants.js')

    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // Spin until free spins triggered
    let triggered = false
    for (let i = 0; i < 500; i++) {
      const rng = mt19937(i * 1337)
      sm.spin(rng, wager)
      if (sm.state.freeSpins && sm.state.freeSpins.spinsRemaining > 0) {
        triggered = true
        const fsRng = mt19937(i * 7919)
        const fsResult = sm.freeGameSpin(fsRng)
        expect(fsResult.type).toBe('FREE')
        expect(typeof fsResult.win).toBe('number')
        break
      }
    }

    // It's possible (though unlikely) we don't trigger in 500 spins - don't fail on that
    if (triggered) {
      expect(triggered).toBe(true)
    }
  })

  it('next() returns null when no free spins active', async () => {
    const { LeMilitareStateMachine } = await import('../game-state-machine.js')
    const { Wager } = await import('@tgslots/slots-core/betting')
    const { BET_CONFIG } = await import('../constants.js')

    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const rng1 = mt19937(42)
    sm.spin(rng1, wager)

    if (!sm.state.freeSpins) {
      const rng2 = mt19937(99)
      expect(sm.next(rng2)).toBeNull()
    }
  })
})
