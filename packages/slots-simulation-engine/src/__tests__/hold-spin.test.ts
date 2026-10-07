import { describe, expect, test } from 'bun:test'
import { BetConfiguration } from '@tgslots/slots-core/betting'
import {
  enterHoldSpin,
  advanceHoldSpin,
  collectHeldPrizes,
  isHoldSpinComplete,
  queueColumnBoosts,
  advanceColumnBoost,
} from '@tgslots/slots-core/hold-spin/hold-spin'
import type {
  HeldPrize,
  HoldSpinState,
  ColumnBoostState,
  ColumnBoostOperation,
} from '@tgslots/slots-core/hold-spin/hold-spin'
import { createSlotsTestEngine } from '../testing/slots-test-engine'

const rules = { columns: 3, rows: 2, respins: 3 }
type State = HoldSpinState<HeldPrize> & ColumnBoostState
/** Deterministic fixture exercises shared mechanics through the standard test harness. */
class Fixture {
  state: State
  constructor(state?: State) {
    this.state = structuredClone(
      state ?? {
        ...enterHoldSpin([{ position: 0, value: 10 }], rules),
        boostedColumns: [],
        pendingColumns: [],
        boostPulls: 0,
      },
    )
  }
  spin() {
    return { type: 'BASE' as const, win: 0 }
  }
  next() {
    return null
  }
  land(arrivals: HeldPrize[]) {
    this.state = { ...this.state, ...advanceHoldSpin(this.state, arrivals, rules) }
    this.state = queueColumnBoosts(this.state, rules)
  }
  boost(operation: ColumnBoostOperation) {
    this.state = advanceColumnBoost(this.state, rules, operation, 2).state
  }
}
const engine = createSlotsTestEngine(Fixture, BetConfiguration.fromLineCount(1)).build()
describe('shared Hold & Spin mechanics', () => {
  test('misses exhaust the counter; a hit resets it and preserves locked credits', () => {
    const machine = engine.createMachine()
    machine.land([])
    machine.land([])
    expect(machine.state.respins).toBe(1)
    machine.land([{ position: 3, value: 20 }])
    expect(machine.state.respins).toBe(3)
    expect(machine.state.coins).toEqual([
      { position: 0, value: 10 },
      { position: 3, value: 20 },
    ])
    machine.land([])
    machine.land([])
    machine.land([])
    expect(isHoldSpinComplete(machine.state, rules)).toBe(true)
    expect(collectHeldPrizes(machine.state)).toBe(30)
    expect(() => machine.land([{ position: 1, value: 5 }])).toThrow('complete')
  })
  test('duplicate positions cannot overwrite locked prizes; failed arrivals leave state intact', () => {
    const machine = engine.createMachine()
    const before = structuredClone(machine.state)
    expect(() => machine.land([{ position: 0, value: 999 }])).toThrow('duplicate')
    expect(() =>
      machine.land([
        { position: 2, value: 3 },
        { position: 2, value: 4 },
      ]),
    ).toThrow('duplicate')
    expect(machine.state).toEqual(before)
    expect(() => machine.land([{ position: 6, value: 1 }])).toThrow()
    expect(() => machine.land([{ position: 1, value: 1.5 }])).toThrow()
  })
  test('full board queues every completed column once; boosts are isolated and never consume respins', () => {
    const machine = engine.createMachine()
    machine.land([1, 2, 3, 4, 5].map((position) => ({ position, value: 10 })))
    expect(isHoldSpinComplete(machine.state, rules)).toBe(true)
    expect(machine.state.pendingColumns).toEqual([0, 1, 2])
    machine.boost({ mode: 'multiply', amount: 7, finish: true })
    expect(machine.state.coins.slice(0, 2).map((coin) => coin.value)).toEqual([70, 70])
    expect(machine.state.coins.slice(2).every((coin) => coin.value === 10)).toBe(true)
    expect(machine.state.respins).toBe(3)
    expect(machine.state.pendingColumns).toEqual([1, 2])
    machine.state = queueColumnBoosts(machine.state, rules)
    expect(machine.state.pendingColumns).toEqual([1, 2])
    machine.boost({ mode: 'add', amount: 5 })
    machine.boost({ mode: 'add', amount: 5 })
    expect(machine.state.pendingColumns).toEqual([2])
    expect(machine.state.boostPulls).toBe(0)
    machine.boost({ mode: 'bank', amount: 0 })
    expect(machine.state.pendingColumns).toEqual([])
    expect(collectHeldPrizes(machine.state)).toBe(200)
    expect(() => machine.boost({ mode: 'bank', amount: 0 })).toThrow('No pending')
  })
  test('booster rejects unsafe integer credit growth without mutating the previous snapshot', () => {
    const machine = engine.createMachine()
    machine.land([{ position: 1, value: Number.MAX_SAFE_INTEGER }])
    const before = structuredClone(machine.state)
    expect(() => machine.boost({ mode: 'multiply', amount: 7 })).toThrow()
    expect(machine.state).toEqual(before)
    expect(() => collectHeldPrizes(machine.state)).toThrow('safe integer')
  })
})
