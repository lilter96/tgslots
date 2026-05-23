import { describe, expect, it } from 'bun:test'
import { BaseScatterEngine } from '../scatter/evaluator.js'
import { PrecomputedScatterEngine } from '../scatter/precomputed-engine.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'

function makeGrid(symbols: number[][]): EvalGrid {
  return {
    reelCount: symbols.length,
    rowCount: symbols[0]?.length ?? 0,
    getSymbol(reel, row) {
      return symbols[reel]?.[row] ?? 0
    },
    getMultiplier: () => 1,
  }
}

// scatter symbolId = 7, payouts: index=count → win multiplier
const SCATTER_DEF = {
  symbolId: 7,
  payouts: [0, 0, 0, 5, 20, 100],
}

describe('BaseScatterEngine', () => {
  it('counts scatter symbols across all reels/rows', () => {
    const engine = new BaseScatterEngine(SCATTER_DEF)
    const g = makeGrid([
      [7, 7, 0],
      [0, 7, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ])
    const result = engine.evaluate(g, 2)
    expect(result.count).toBe(3)
    expect(result.win).toBe(10) // payout[3]=5 * bet 2
  })

  it('returns zero win when below minimum payout count', () => {
    const engine = new BaseScatterEngine(SCATTER_DEF)
    const g = makeGrid([
      [7, 0, 0],
      [7, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ])
    const result = engine.evaluate(g, 2)
    expect(result.count).toBe(2)
    expect(result.win).toBe(0)
  })

  it('returns zero when no scatter symbols present', () => {
    const engine = new BaseScatterEngine(SCATTER_DEF)
    const g = makeGrid([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ])
    const result = engine.evaluate(g, 1)
    expect(result.count).toBe(0)
    expect(result.win).toBe(0)
  })

  it('returns 0 for count beyond payouts array', () => {
    const engine = new BaseScatterEngine(SCATTER_DEF)
    const g = makeGrid([
      [7, 7, 7],
      [7, 7, 7],
      [7, 7, 7],
      [7, 7, 7],
      [7, 7, 7],
    ])
    const result = engine.evaluate(g, 1)
    expect(result.count).toBe(15)
    expect(result.win).toBe(0) // payout[15] undefined → 0
  })
})

describe('PrecomputedScatterEngine', () => {
  // Strip with scatter symbols at positions 0, 3, 5; length 6, rows=3 → valid stops 0..3
  const strips = [new Uint8Array([7, 0, 0, 7, 0, 7])]
  const rows = 3

  it('counts scatter symbols in each reel window', () => {
    const engine = new PrecomputedScatterEngine(SCATTER_DEF, strips, rows)
    // Stop position 0: rows 0-2 → symbols [7,0,0] → 1 scatter
    const result = engine.evaluateAtPositions([0], 1)
    expect(result.count).toBe(1)
    expect(result.win).toBe(0) // payout[1]=0
  })

  it('counts multiple scatters in a window', () => {
    const engine = new PrecomputedScatterEngine(SCATTER_DEF, strips, rows)
    // Stop position 3: rows 3-5 → symbols [7,0,7] → 2 scatters
    const result = engine.evaluateAtPositions([3], 1)
    expect(result.count).toBe(2)
    expect(result.win).toBe(0)
  })

  it('multiplies win by bet', () => {
    // Need 3 scatters for a payout. Use 3 reels each with 1 scatter.
    const threeStrips = [new Uint8Array([7, 0]), new Uint8Array([7, 0]), new Uint8Array([7, 0])]
    const engine = new PrecomputedScatterEngine(SCATTER_DEF, threeStrips, 1)
    const result = engine.evaluateAtPositions([0, 0, 0], 10)
    expect(result.count).toBe(3)
    expect(result.win).toBe(50) // payout[3]=5 * bet 10
  })

  it('returns zero win for count below threshold', () => {
    const twoStrips = [new Uint8Array([7, 0]), new Uint8Array([0, 7])]
    const engine = new PrecomputedScatterEngine(SCATTER_DEF, twoStrips, 1)
    // Stop 0,1 → scatter from strip0 pos0, strip1 pos1... wait strip1 pos1 in window [0] = [0] → no scatter
    // Let me recalculate: stop positions [0, 0] on strips [[7,0],[0,7]] with rows=1
    // strip0 stop 0 rows 1 → [7] → 1 scatter
    // strip1 stop 0 rows 1 → [0] → 0 scatter
    const result = engine.evaluateAtPositions([0, 0], 1)
    expect(result.count).toBe(1)
    expect(result.win).toBe(0)
  })
})
