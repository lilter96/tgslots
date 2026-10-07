import { describe, it, expect } from 'bun:test'
import { createSlotsTestEngine } from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { LeMilitareStateMachine, BET_CONFIG } from '../index.js'
import { BUY_OPTIONS, FREE_SPIN_AWARDS } from '../constants.js'

const engine = createSlotsTestEngine(LeMilitareStateMachine, BET_CONFIG)
  .registerAction('buyTier', (session, option: 'standard' | 'elite' | 'super') =>
    session.executeResultStep('buyTier', () =>
      session.sm.buyBonus(session.rng, session.wager, option),
    ),
  )
  .registerAction('buyChanceSpin', (session) =>
    session.executeResultStep('buyChanceSpin', () =>
      session.sm.buyChanceSpin(session.rng, session.wager),
    ),
  )
  .registerAction('buyAirRaidSpin', (session) =>
    session.executeResultStep('buyAirRaidSpin', () =>
      session.sm.buyAirRaidSpin(session.rng, session.wager),
    ),
  )
  .build()

function drainRound(session: ReturnType<typeof engine.session>, firstWin: number): number {
  let total = firstWin
  let next
  while ((next = session.act('next')) !== null) total += next.win
  return total
}

describe('feature buy options', () => {
  for (const option of ['standard', 'elite', 'super'] as const) {
    it(`buyBonus("${option}") enters free spins with the tier's parameters`, () => {
      const session = engine.session({ seed: 99 })
      const result = session.act('buyTier', option)
      const tier = BUY_OPTIONS[option]
      expect(result.type).toBe('BUY')
      expect(result.triggeredFreeSpins).toBe(true)
      expect(result.freeSpinsAwarded).toBe(FREE_SPIN_AWARDS[tier.minScatters]!)
      expect(session.sm.state.freeSpins).not.toBeNull()
      expect(session.sm.state.freeSpins!.spinsRemaining).toBe(FREE_SPIN_AWARDS[tier.minScatters]!)
      expect(session.sm.state.freeSpins!.armedReels.size).toBe(tier.startArmedReels)
      expect(session.sm.state.freeSpins!.multiplierSum).toBe(tier.startMultiplier)
      expect(Number.isInteger(result.win)).toBe(true)
      expect(result.win).toBeGreaterThanOrEqual(0)
      const total = drainRound(session, result.win)
      expect(Number.isInteger(total)).toBe(true)
      expect(Number.isFinite(total)).toBe(true)
    })
  }

  it('buyChanceSpin returns a valid base spin', () => {
    const session = engine.session({ seed: 7 })
    const result = session.act('buyChanceSpin')
    expect(result.type).toBe('BASE')
    expect(Number.isInteger(result.win)).toBe(true)
    expect(result.win).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(drainRound(session, result.win))).toBe(true)
  })

  it('every purchased Air Raid preserves its squadron, including zero-hit flights', () => {
    let hits = 0
    let misses = 0
    for (let seed = 0; seed < 200; seed++) {
      const session = engine.session({ seed })
      const result = session.act('buyAirRaidSpin')
      expect(result.type).toBe('BASE')
      expect(Number.isInteger(result.win)).toBe(true)
      expect(result.airRaid).not.toBeNull()
      const raid = result.airRaid!
      expect(raid.squadronSize).toBeGreaterThan(0)
      expect(raid.placements.length).toBeLessThanOrEqual(raid.squadronSize)
      expect(raid.preRaidGrid.length).toBe(5)
      if (raid.placements.length) hits++
      else misses++
    }
    expect(hits).toBeGreaterThan(100)
    expect(misses).toBeGreaterThan(0)
  })
})
