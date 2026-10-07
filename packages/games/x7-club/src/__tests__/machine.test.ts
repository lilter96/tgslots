import { describe, expect, test } from 'bun:test'
import { createSlotsTestEngine } from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { X7ClubMachine, initialState } from '../machine'
import { BET_CONFIG, config } from '../constants'
import type { ClubState } from '../types'

const engine = createSlotsTestEngine(X7ClubMachine, BET_CONFIG).build()
function bonusState(positions: number[], respins = 3): ClubState {
  return {
    ...initialState(),
    phase: 'HOLD',
    bonus: {
      coins: positions.map((position) => ({ position, value: 20, tier: 'CREDIT' })),
      respins,
      boostedColumns: [],
      pendingColumns: [],
      boostPulls: 0,
    },
  }
}
describe('X7 Club', () => {
  test('identical seed and serialized state replay the same full round', () => {
    const first = engine.createMachine()
    const second = engine.createMachine()
    const a = engine.rng(77)
    const b = engine.rng(77)
    expect(first.spin(a, engine.wager(3))).toEqual(second.spin(b, engine.wager(3)))
    for (let i = 0; i < 100; i++) {
      const left = first.next(a)
      expect(left).toEqual(second.next(b))
      if (!left) break
    }
    expect(first.state).toEqual(second.state)
  })
  test('buy entry costs no payout and preserves stake with six locked coins', () => {
    const machine = engine.createMachine()
    const result = machine.buyBonus(engine.wager(7))
    expect(result.win).toBe(0)
    expect(result.coins).toHaveLength(6)
    expect(machine.state.triggeringMultiplier).toBe(7)
    expect(machine.state.bonus?.respins).toBe(3)
    expect(() => machine.spin(engine.rng(1), engine.wager())).toThrow()
  })
  test('locked coins survive, hits reset respins and misses decrement them', () => {
    let hits = 0
    let misses = 0
    for (let seed = 0; seed < 80; seed++) {
      const machine = engine.createMachine(bonusState([0, 4, 8, 12]))
      const result = machine.next(engine.rng(seed))!
      for (const position of [0, 4, 8, 12])
        expect(result.coins.find((c) => c.position === position)?.value).toBe(20)
      expect(new Set(result.coins.map((c) => c.position)).size).toBe(result.coins.length)
      if (result.newCoins.length) {
        hits++
        expect(result.respins).toBe(3)
      } else {
        misses++
        expect(result.respins).toBe(2)
      }
    }
    expect(hits).toBeGreaterThan(0)
    expect(misses).toBeGreaterThan(0)
  })
  test('full column earns its boost exactly once and boost leaves respins unchanged', () => {
    const state = bonusState([0, 1, 2, 4, 8, 12])
    const machine = engine.createMachine(state)
    machine.next(engine.rng(1))
    expect(machine.state.phase).toBe('BOOST')
    const respins = machine.state.bonus!.respins
    const result = machine.next(engine.rng(1))!
    expect(result.boost?.column).toBe(0)
    expect(machine.state.bonus!.respins).toBe(respins)
    expect(machine.state.bonus!.boostedColumns.filter((c) => c === 0)).toHaveLength(1)
  })
  test('all pending boosts resolve before a full board pays, and pay only once', () => {
    const state = bonusState(Array.from({ length: 15 }, (_, i) => i))
    const machine = engine.createMachine(state)
    const rng = engine.rng(7)
    let paid = 0
    for (let i = 0; i < 40; i++) {
      const result = machine.next(rng)
      if (!result) break
      paid += result.win
      if (!result.bonusEnded) expect(result.win).toBe(0)
    }
    expect(machine.state.phase).toBe('BASE')
    expect(paid).toBeGreaterThanOrEqual(300)
    expect(machine.next(rng)).toBeNull()
  })
  test('rare X7 multiplies only the selected column and ends its booster', () => {
    const state = bonusState([0, 1, 2, 4, 8, 12])
    state.phase = 'BOOST'
    state.bonus!.pendingColumns = [0]
    state.bonus!.boostedColumns = [0]
    let found = false
    for (let seed = 0; seed < 2000; seed++) {
      const machine = engine.createMachine(state)
      const result = machine.next(engine.rng(seed))!
      if (result.boost?.kind !== 'X7') continue
      expect(result.coins.filter((c) => c.position < 3).every((c) => c.value === 140)).toBe(true)
      expect(result.coins.find((c) => c.position === 4)?.value).toBe(20)
      expect(result.boost.finished).toBe(true)
      found = true
      break
    }
    expect(found).toBe(true)
  })
  test('cap applies to the whole round including earlier line awards', () => {
    const state = bonusState([0, 4, 8, 12], 1)
    state.roundWin = config.maxWinX * 20 - 5
    for (let seed = 0; seed < 100; seed++) {
      const machine = engine.createMachine(state)
      const result = machine.next(engine.rng(seed))!
      if (!result.bonusEnded) continue
      expect(result.win).toBe(5)
      expect(result.capped).toBe(true)
      return
    }
    throw new Error('No terminating sample found')
  })
  test('seeded rounds terminate with integer awards and bounded totals', () => {
    for (let seed = 0; seed < 250; seed++) {
      const machine = engine.createMachine()
      const rng = engine.rng(seed)
      const wager = engine.wager(3)
      let total = machine.spin(rng, wager).win
      let steps = 0
      for (;;) {
        const next = machine.next(rng)
        if (!next) break
        expect(Number.isSafeInteger(next.win)).toBe(true)
        total += next.win
        expect(++steps).toBeLessThan(100)
      }
      expect(total).toBeLessThanOrEqual(config.maxWinX * wager.totalWager)
      expect(machine.state.phase).toBe('BASE')
    }
  })
  test('line highlights stop at the winning prefix and awards scale with integer stakes', () => {
    let hit = false
    for (let seed = 0; seed < 100; seed++) {
      const a = engine.createMachine().spin(engine.rng(seed), engine.wager(1))
      const b = engine.createMachine().spin(engine.rng(seed), engine.wager(7))
      expect(b.win).toBe(a.win * 7)
      expect(b.grid).toEqual(a.grid)
      for (const line of a.hits) {
        expect(line.matchCount).toBeGreaterThanOrEqual(3)
        expect(line.matchCount).toBeLessThanOrEqual(5)
        hit = true
      }
    }
    expect(hit).toBe(true)
  })
  test('all sampled weights and configured credit awards are positive integers', () => {
    for (const weight of config.weights)
      expect(Number.isSafeInteger(weight) && weight > 0).toBe(true)
    for (const [, value, weight] of config.prizes) {
      expect(Number.isSafeInteger(value) && Number(value) > 0).toBe(true)
      expect(Number.isSafeInteger(weight) && Number(weight) > 0).toBe(true)
    }
  })
})

import { X7ClubSimulationMachine, simulationBetConfig } from '../simulation-state-machine'
test('purchased-round simulation records the actual 77× purchase cost and the original stake', () => {
  const purchased = createSlotsTestEngine(X7ClubSimulationMachine, simulationBetConfig('buy'), [
    'buy',
  ]).build()
  const session = purchased.session({ seed: 7, betLevel: 3 })
  const round = session.act('cycle')
  expect(round.results[0]!.type).toBe('BUY')
  expect(round.results[0]!.coins.every((coin) => coin.value === config.buyEntryCredits * 3)).toBe(
    true,
  )
  expect(round.snapshot!.bet).toBe(20 * 77 * 3)
  expect(round.snapshot!.totalWin).toBe(round.results.reduce((sum, result) => sum + result.win, 0))
  expect(session.sm.state.phase).toBe('BASE')
  expect(() => simulationBetConfig('invalid')).toThrow()
})
