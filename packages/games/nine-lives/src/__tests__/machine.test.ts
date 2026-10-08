import { describe, expect, test } from 'bun:test'
import { createSlotsTestEngine } from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { evaluateClusters } from '@tgslots/slots-core'
import { NineLivesMachine, initialState } from '../machine'
import { BET_CONFIG, config } from '../constants'
import { engine as clusterEngine, project } from '../samplers'
import { NineLivesSimulationMachine, simulationBetConfig } from '../simulation-state-machine'
const engine = createSlotsTestEngine(NineLivesMachine, BET_CONFIG).build()
describe('Nine Lives state machine', () => {
  test('seed and serialized state reproduce every result of a full bonus', () => {
    const a = engine.createMachine(),
      b = engine.createMachine()
    expect(a.buyBonus(engine.wager(3))).toEqual(b.buyBonus(engine.wager(3)))
    const ra = engine.rng(777),
      rb = engine.rng(777)
    for (let i = 0; i < 9; i++) expect(a.next(ra)).toEqual(b.next(rb))
    expect(a.state).toEqual(b.state)
    expect(a.next(ra)).toBeNull()
  })
  test('each collection replaces exactly its chips with consumable Wild and pays once', () => {
    let checked = 0
    for (let seed = 0; seed < 100; seed++) {
      const machine = engine.createMachine()
      machine.buyBonus(engine.wager(2))
      const rng = engine.rng(seed)
      for (let i = 0; i < 9; i++) {
        const previous = machine.state.multiplier,
          result = machine.next(rng)!
        expect(result.collectionWin).toBe(
          result.coins.reduce((sum, coin) => sum + coin.value * previous, 0),
        )
        const first = result.steps[0]
        if (first)
          for (const coin of result.coins)
            expect(first.before[Math.floor(coin.position / 5)]![coin.position % 5]).toBe(0)
        expect(result.win).toBe(
          result.collectionWin + result.steps.reduce((sum, step) => sum + step.win, 0),
        )
        checked += result.coins.length
        if (result.bonusEnded) break
      }
      expect(machine.next(rng)).toBeNull()
    }
    expect(checked).toBeGreaterThan(0)
  })
  test('nine lives decrement on every free spin, multiplier persists and no paid spin interrupts', () => {
    const machine = engine.createMachine()
    machine.buyBonus(engine.wager())
    expect(() => machine.spin(engine.rng(1), engine.wager())).toThrow()
    expect(() => machine.buyBonus(engine.wager())).toThrow()
    const rng = engine.rng(9)
    let previous = 1
    for (let i = 0; i < 9; i++) {
      const result = machine.next(rng)!
      expect(result.remaining).toBe(8 - i)
      expect(result.multiplier).toBe(Math.min(config.maxMultiplier, previous + result.steps.length))
      previous = result.multiplier
    }
    expect(machine.state.phase).toBe('BASE')
    expect(machine.next(rng)).toBeNull()
  })
  test('cluster snapshots match common evaluator and gravity preserves surviving symbols', () => {
    let cascades = 0
    for (let seed = 0; seed < 150; seed++) {
      const result = engine.createMachine().spin(engine.rng(seed), engine.wager(7))
      for (const [index, step] of result.steps.entries()) {
        const evaluation = evaluateClusters(project(step.before.flat()), clusterEngine)
        expect(step.hits).toEqual(evaluation.hits)
        expect(step.win).toBe(evaluation.totalWin * 7 * Math.min(config.maxMultiplier, index + 1))
        for (let reel = 0; reel < 6; reel++) {
          const survivors = step.before[reel]!.filter(
            (_, row) => !step.vanished.includes(reel * 5 + row),
          )
          if (survivors.length)
            expect(step.after[reel]!.slice(-survivors.length)).toEqual(survivors)
        }
        cascades++
      }
    }
    expect(cascades).toBeGreaterThan(0)
  })
  test('only 4 initial scatters trigger nine lives; refill cannot add scatter or cash chips', () => {
    let triggers = 0
    for (let seed = 0; seed < 5000; seed++) {
      const machine = engine.createMachine(),
        result = machine.spin(engine.rng(seed), engine.wager())
      expect(result.scatters).toBe(result.grid.flat().filter((id) => id === 7).length)
      expect(result.bonusTriggered).toBe(result.scatters >= 4)
      expect(machine.state.remaining).toBe(result.bonusTriggered ? 9 : 0)
      for (const step of result.steps)
        for (let reel = 0; reel < 6; reel++) {
          const newCount = step.vanished.filter((p) => Math.floor(p / 5) === reel).length
          expect(step.after[reel]!.slice(0, newCount).every((id) => id !== 6 && id !== 7)).toBe(
            true,
          )
        }
      if (result.bonusTriggered) triggers++
    }
    expect(triggers).toBeGreaterThan(0)
  })
  test('whole-round cap includes prior payouts and ends the remaining lives', () => {
    const state = {
      ...initialState(),
      phase: 'FREE' as const,
      remaining: 9,
      roundWin: config.maxWinX * 20 - 3,
      bonusWin: 200,
      multiplier: 25,
    }
    for (let seed = 0; seed < 100; seed++) {
      const machine = engine.createMachine(state),
        rng = engine.rng(seed),
        result = machine.next(rng)!
      if (result.win === 0) continue
      expect(result.win).toBe(3)
      expect(result.capped).toBe(true)
      expect(result.bonusEnded).toBe(true)
      expect(machine.next(rng)).toBeNull()
      return
    }
    throw new Error('Expected cap sample')
  })
  test('restoring a bonus preserves the original stake and multiplier', () => {
    const a = engine.createMachine()
    a.buyBonus(engine.wager(7))
    a.next(engine.rng(4))
    const b = engine.createMachine(JSON.parse(JSON.stringify(a.state)))
    expect(a.next(engine.rng(5))).toEqual(b.next(engine.rng(5)))
    expect(b.state.triggeringMultiplier).toBe(7)
  })
  test('integer awards scale linearly with stake and paid-spin multiplier resets', () => {
    for (let seed = 0; seed < 200; seed++) {
      const a = engine.createMachine().spin(engine.rng(seed), engine.wager())
      const machine = engine.createMachine({ ...initialState(), multiplier: 25 })
      const b = machine.spin(engine.rng(seed), engine.wager(11))
      expect(b.win).toBe(a.win * 11)
      expect(b.grid).toEqual(a.grid)
      expect(Number.isSafeInteger(b.win)).toBe(true)
    }
  })
})
test('simulation purchase denominator uses the real price while awards retain original stake', () => {
  const purchased = createSlotsTestEngine(NineLivesSimulationMachine, simulationBetConfig('buy'), [
    'buy',
  ]).build()
  const session = purchased.session({ seed: 77, betLevel: 3 }),
    round = session.act('cycle')
  expect(round.snapshot!.bet).toBe(config.baseCost * config.buyCost * 3)
  expect(round.results[0]!.type).toBe('BUY')
  expect(round.results.filter((result) => result.type === 'FREE')).toHaveLength(9)
  expect(round.snapshot!.totalWin).toBe(round.results.reduce((sum, result) => sum + result.win, 0))
  expect(session.sm.state.triggeringMultiplier).toBe(3)
  expect(() => simulationBetConfig('invalid')).toThrow()
})
