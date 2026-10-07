import { describe, expect, it } from 'bun:test'
import { createSlotEngine, buildEngineFromArrays } from '../paylines/slot-engine.js'

describe('createSlotEngine', () => {
  const config = {
    reelCount: 5,
    rowCount: 3,
    wildSymbol: 'W',
    paytable: {
      A: { 3: 10, 4: 25, 5: 100 },
      B: { 3: 5, 4: 15, 5: 40 },
    },
    paylines: [{ rows: [0, 0, 0, 0, 0] }, { rows: [1, 1, 1, 1, 1] }, { rows: [2, 2, 2, 2, 2] }],
  }

  it('creates an engine with correct dimensions', () => {
    const engine = createSlotEngine(config)
    expect(engine.reelCount).toBe(5)
    expect(engine.rowCount).toBe(3)
  })

  it('registers symbols including wild', () => {
    const engine = createSlotEngine(config)
    expect(engine.symbols.toId.get('W')).toBe(0)
    expect(engine.symbols.toId.get('A')).toBeDefined()
    expect(engine.symbols.toId.get('B')).toBeDefined()
  })

  it('builds payline trie', () => {
    const engine = createSlotEngine(config)
    expect(engine.trie.root).toBeDefined()
    expect(engine.trie.paylineOrder.length).toBe(3)
  })

  it('builds flat paytable', () => {
    const engine = createSlotEngine(config)
    const aId = engine.symbols.toId.get('A')!
    expect(engine.paytable.payouts[aId]![3]).toBe(10)
    expect(engine.paytable.minPayCount).toBe(3)
  })

  it('defaults wildSymbol to WILD', () => {
    const noWild = { ...config, wildSymbol: undefined }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { wildSymbol, ...rest } = noWild
    const engine = createSlotEngine(rest as typeof config)
    expect(engine.symbols.toId.get('WILD')).toBe(0)
  })
})

describe('buildEngineFromArrays', () => {
  it('converts flat array constants to engine', () => {
    const raw = {
      reelCount: 3,
      rowCount: 3,
      wildSymbol: 'W',
      paylineData: new Uint8Array([0, 0, 0, 1, 1, 1]),
      payTable: [
        [0, 10, 25, 50, 100],
        [0, 5, 15, 30, 60],
      ],
      symbols: { A: 0, B: 1, W: 2 },
    }
    const engine = buildEngineFromArrays(raw)
    expect(engine.reelCount).toBe(3)
    expect(engine.rowCount).toBe(3)
    expect(engine.trie.paylineOrder.length).toBe(2) // 6 positions / 3 reels = 2 paylines
    const aId = engine.symbols.toId.get('A')
    expect(aId).toBeDefined()
  })

  it('preserves non-paying symbol IDs without adding payouts', () => {
    const raw = {
      reelCount: 3,
      rowCount: 3,
      wildSymbol: 'W',
      paylineData: new Uint8Array([0, 0, 0]),
      payTable: [[0, 0, 0, 0, 0]], // all zeros
      symbols: { A: 0, W: 1 },
    }
    const engine = buildEngineFromArrays(raw)
    expect(engine.symbols.toId.get('A')).toBe(0)
    expect(engine.symbols.wildId).toBe(1)
    expect(engine.symbols.count).toBe(2)
  })
})
