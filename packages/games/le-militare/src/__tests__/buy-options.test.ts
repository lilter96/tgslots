import { describe, it, expect } from 'bun:test'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import type { Rng } from '@tgslots/math/rng/types'
import { LeMilitareStateMachine, BET_CONFIG } from '../index.js'
import { BUY_OPTIONS, FREE_SPIN_AWARDS } from '../constants.js'

const wager = () => new Wager(1, BET_CONFIG)

function drainRound(sm: LeMilitareStateMachine, rng: Rng, firstWin: number): number {
  let total = firstWin
  let next
  while ((next = sm.next(rng)) !== null) total += next.win
  return total
}

describe('feature buy options', () => {
  for (const option of ['standard', 'elite', 'super'] as const) {
    it(`buyBonus("${option}") enters free spins with the tier's parameters`, () => {
      const rng = mt19937(99)
      const sm = new LeMilitareStateMachine()
      const result = sm.buyBonus(rng, wager(), option)
      const tier = BUY_OPTIONS[option]

      expect(result.type).toBe('BUY')
      expect(result.triggeredFreeSpins).toBe(true)
      expect(result.freeSpinsAwarded).toBe(FREE_SPIN_AWARDS[tier.minScatters]!)
      expect(sm.state.freeSpins).not.toBeNull()
      expect(sm.state.freeSpins!.spinsRemaining).toBe(FREE_SPIN_AWARDS[tier.minScatters]!)
      expect(sm.state.freeSpins!.armedReels.size).toBe(tier.startArmedReels)
      expect(sm.state.freeSpins!.multiplierSum).toBe(tier.startMultiplier)
      expect(Number.isInteger(result.win)).toBe(true)
      expect(result.win).toBeGreaterThanOrEqual(0)

      const total = drainRound(sm, rng, result.win)
      expect(Number.isInteger(total)).toBe(true)
      expect(Number.isFinite(total)).toBe(true)
    })
  }

  it('buyChanceSpin returns a valid base spin', () => {
    const rng = mt19937(7)
    const sm = new LeMilitareStateMachine()
    const result = sm.buyChanceSpin(rng, wager())
    expect(result.type).toBe('BASE')
    expect(Number.isInteger(result.win)).toBe(true)
    expect(result.win).toBeGreaterThanOrEqual(0)
    const total = drainRound(sm, rng, result.win)
    expect(Number.isFinite(total)).toBe(true)
  })

  it('buyAirRaidSpin always stages an Air Raid (multiplier present across many spins)', () => {
    let raids = 0
    for (let seed = 0; seed < 200; seed++) {
      const rng = mt19937(seed)
      const sm = new LeMilitareStateMachine()
      const result = sm.buyAirRaidSpin(rng, wager())
      expect(result.type).toBe('BASE')
      expect(Number.isInteger(result.win)).toBe(true)
      // A forced raid that intercepts >=1 plane yields a multiplier; over 200
      // spins the vast majority should (hit chance is well above zero).
      if (result.multiplierSum > 0) raids++
    }
    expect(raids).toBeGreaterThan(100)
  })
})
