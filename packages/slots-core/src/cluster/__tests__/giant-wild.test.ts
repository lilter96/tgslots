import { describe, expect, it } from 'bun:test'
import { createClusterSlotEngine } from '../cluster-engine.js'
import { evaluateClusters } from '../evaluator.js'
import { MutableCascadeGrid } from '../../cascade/cascade-grid.js'
import { EMPTY_SYMBOL } from '../../symbol-registry.js'

const engine = createClusterSlotEngine({
  reelCount: 6,
  rowCount: 5,
  wildSymbol: 'WILD',
  disallowMixedWilds: true,
  paytable: { A: { '6': 10, '7': 20, '8': 30 }, B: { '6': 5, '7': 15, '8': 25 } },
})
const wild = engine.symbols.wildId
const a = engine.symbols.toId.get('A')!
const b = engine.symbols.toId.get('B')!

function fixture(giantReels: number[]) {
  const grid = new MutableCascadeGrid(6, 5)
  const weights = new Uint8Array(30).fill(1)
  for (let reel = 0; reel < 6; reel++) {
    for (let row = 0; row < 5; row++) {
      grid.setSymbol(reel, row, giantReels.includes(reel) ? wild : EMPTY_SYMBOL)
      if (giantReels.includes(reel) && row > 0) weights[reel * 5 + row] = 0
    }
  }
  return { grid, weights }
}

describe('giant WILD cluster counting', () => {
  it('one adjacent symbol plus a giant is two symbols, not six', () => {
    const { grid, weights } = fixture([0])
    grid.setSymbol(1, 4, a)
    expect(evaluateClusters(grid, engine, weights).hits).toHaveLength(0)
    expect(evaluateClusters(grid, engine).hits[0]!.size).toBe(6)
  })

  it('connects five paying symbols at different heights and counts the giant once', () => {
    const { grid, weights } = fixture([1])
    for (let row = 0; row < 5; row++) grid.setSymbol(row % 2 === 0 ? 0 : 2, row, a)
    const result = evaluateClusters(grid, engine, weights)
    expect(result.totalWin).toBe(10)
    expect(result.hits[0]!.size).toBe(6)
    expect(result.hits[0]!.positions).toHaveLength(10)
  })

  it('counts two connected giants separately, with four paying symbols', () => {
    const { grid, weights } = fixture([1, 2])
    for (let row = 0; row < 4; row++) grid.setSymbol(0, row, a)
    const result = evaluateClusters(grid, engine, weights)
    expect(result.totalWin).toBe(10)
    expect(result.hits[0]!.size).toBe(6)
    expect(result.hits[0]!.positions).toHaveLength(14)
  })

  it('a below-threshold candidate cannot claim a giant needed by a later winning symbol', () => {
    const { grid, weights } = fixture([1])
    grid.setSymbol(0, 0, a) // First symbol in scan order; physical size six, effective size two.
    for (let row = 0; row < 5; row++) grid.setSymbol(2, row, b)
    const result = evaluateClusters(grid, engine, weights)
    expect(result.hits).toHaveLength(1)
    expect(result.hits[0]!.symbolId).toBe(b)
    expect(result.hits[0]!.size).toBe(6)
    expect(result.totalWin).toBe(5)
  })

  it('ordinary WILDs still count individually alongside a giant', () => {
    const { grid, weights } = fixture([0])
    for (let row = 0; row < 4; row++) grid.setSymbol(1, row, a)
    grid.setSymbol(1, 4, wild)
    expect(evaluateClusters(grid, engine, weights).hits[0]!.size).toBe(6)
  })

  it('rejects incomplete position weights', () => {
    const { grid } = fixture([0])
    expect(() => evaluateClusters(grid, engine, new Uint8Array(29))).toThrow('30 positions')
  })
})
