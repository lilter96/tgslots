// ── Cluster Evaluator Tests ────────────────────────────────

import { describe, expect, it } from 'bun:test'
import { createClusterSlotEngine } from '../cluster/cluster-engine.js'
import { evaluateClusters } from '../cluster/evaluator.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'
import { EMPTY_SYMBOL } from '../symbol-registry.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fixed EvalGrid from a 2D array: `symbols[reel][row]` = symbol name.
 * Wild = 'W', Scatter = 'SC', empty slot use EMPTY.
 */
function makeGrid(symbols: string[][], registry: { toId: ReadonlyMap<string, number> }): EvalGrid {
  const reelCount = symbols.length
  const rowCount = symbols[0]?.length ?? 0
  return {
    reelCount,
    rowCount,
    getSymbol(reel, row) {
      const name = symbols[reel]?.[row]
      if (name === 'EMPTY') return EMPTY_SYMBOL
      if (name === undefined) return EMPTY_SYMBOL
      return registry.toId.get(name) ?? -99
    },
    getMultiplier: () => 1,
  }
}

// Paytable covers all possible cluster sizes on a 5×3 grid (max 15 cells).
const ENGINE = createClusterSlotEngine({
  reelCount: 5,
  rowCount: 3,
  wildSymbol: 'W',
  paytable: {
    A: {
      3: 10,
      4: 20,
      5: 50,
      6: 100,
      7: 150,
      8: 200,
      9: 250,
      10: 300,
      11: 350,
      12: 400,
      13: 450,
      14: 500,
      15: 1000,
    },
    B: {
      3: 5,
      4: 15,
      5: 40,
      6: 80,
      7: 120,
      8: 160,
      9: 200,
      10: 240,
      11: 280,
      12: 320,
      13: 360,
      14: 400,
      15: 800,
    },
  },
})

function grid(symbols: string[][]): EvalGrid {
  return makeGrid(symbols, ENGINE.symbols)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('evaluateClusters', () => {
  it('returns no hits on an empty grid', () => {
    const g = grid([
      ['EMPTY', 'EMPTY', 'EMPTY'],
      ['EMPTY', 'EMPTY', 'EMPTY'],
      ['EMPTY', 'EMPTY', 'EMPTY'],
      ['EMPTY', 'EMPTY', 'EMPTY'],
      ['EMPTY', 'EMPTY', 'EMPTY'],
    ])
    const result = evaluateClusters(g, ENGINE)
    expect(result.hits).toHaveLength(0)
    expect(result.totalWin).toBe(0)
  })

  it('returns no hits when all cells are wild', () => {
    const g = grid([
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
    ])
    const result = evaluateClusters(g, ENGINE)
    expect(result.hits).toHaveLength(0)
  })

  it('returns no hits when cluster is below threshold', () => {
    // 2 connected A's — below minPayCount of 3
    const g = grid([
      ['A', 'B', 'B'],
      ['A', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    // A cluster size = 2 (reel 0, rows 0–1) — no payout
    // B cluster = 13 cells but paytable only goes to index 5; payout at [5] = 40
    const result = evaluateClusters(g, ENGINE)
    const aHits = result.hits.filter((h) => h.symbolName === 'A')
    expect(aHits).toHaveLength(0)
  })

  it('returns a hit for a cluster exactly at threshold', () => {
    // 3 connected A's: reel 0 rows 0-1, reel 1 row 0
    const g = grid([
      ['A', 'A', 'B'],
      ['A', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    const result = evaluateClusters(g, ENGINE)
    const aHit = result.hits.find((h) => h.symbolName === 'A')
    expect(aHit).toBeDefined()
    expect(aHit!.size).toBe(3)
    expect(aHit!.basePayout).toBe(10)
    expect(aHit!.totalPayout).toBe(10)
    // Positions encode reel * rowCount + row. rowCount = 3.
    // A at (reel=0,row=0)→0, (reel=0,row=1)→1, (reel=1,row=0)→3
    expect(new Set(aHit!.positions)).toEqual(new Set([0, 1, 3]))
  })

  it('returns multiple hits for disjoint clusters of different symbols', () => {
    // A cluster at top-left, B cluster at top-right
    const g = grid([
      ['A', 'A', 'B'],
      ['A', 'B', 'B'],
      ['B', 'B', 'A'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    const result = evaluateClusters(g, ENGINE)
    const aHit = result.hits.find((h) => h.symbolName === 'A')
    const bHit = result.hits.find((h) => h.symbolName === 'B')
    expect(aHit).toBeDefined()
    expect(bHit).toBeDefined()
  })

  it('merges two A regions via a wild bridge into one cluster', () => {
    // Reel layout (5 reels, 3 rows): A . A with wild in the middle
    // reel0: [A, B, B]  reel1: [W, B, B]  reel2: [A, B, B]  reel3: [B,B,B]  reel4: [B,B,B]
    // A at (0,0) is 4-adj to W at (1,0); W at (1,0) is 4-adj to A at (2,0) → merged cluster size 3
    const g = grid([
      ['A', 'B', 'B'],
      ['W', 'B', 'B'],
      ['A', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    const result = evaluateClusters(g, ENGINE)
    const aHit = result.hits.find((h) => h.symbolName === 'A')
    expect(aHit).toBeDefined()
    expect(aHit!.size).toBe(3) // A + W + A
    expect(aHit!.basePayout).toBe(10)
    // Positions: (0,0)→0, (1,0)→3 (wild), (2,0)→6
    expect(new Set(aHit!.positions)).toEqual(new Set([0, 3, 6]))
  })

  it('includes a wild in both clusters when it bridges two different symbols', () => {
    // Layout (reel × row):
    //   reel0: [A, A, A]    — 3 A's form A cluster
    //   reel1: [W, EMPTY, EMPTY]  — wild bridges A and B
    //   reel2: [B, B, B]    — 3 B's form B cluster
    //   reel3-4: EMPTY
    //
    // A sweep: (0,0) seeds BFS. (1,0)=W is 4-adj → included.
    //   From W: (2,0)=B is not traversable for A → stops.
    //   A cluster = {(0,0),(0,1),(0,2),(1,0)} size=4, payout=20.
    //
    // B sweep: (2,0) seeds BFS. (1,0)=W is 4-adj → included.
    //   From W: (0,0)=A not traversable for B → stops.
    //   B cluster = {(2,0),(2,1),(2,2),(1,0)} size=4, payout=15.
    //
    // Wild at encoded pos 3 (reel=1, row=0) appears in both clusters.
    const g = grid([
      ['A', 'A', 'A'],
      ['W', 'EMPTY', 'EMPTY'],
      ['B', 'B', 'B'],
      ['EMPTY', 'EMPTY', 'EMPTY'],
      ['EMPTY', 'EMPTY', 'EMPTY'],
    ])
    const result = evaluateClusters(g, ENGINE)
    const aHit = result.hits.find((h) => h.symbolName === 'A')
    const bHit = result.hits.find((h) => h.symbolName === 'B')
    expect(aHit).toBeDefined()
    expect(bHit).toBeDefined()
    const wildPos = 1 * 3 + 0 // reel=1, row=0 → 3
    expect(aHit!.positions).toContain(wildPos)
    expect(bHit!.positions).toContain(wildPos)
  })

  it('does not create a hit for a pure-wild region', () => {
    // Only wilds in the first two cells, nothing else connecting
    const g = grid([
      ['W', 'W', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    const result = evaluateClusters(g, ENGINE)
    // No 'WILD' symbolName hit
    const wildHits = result.hits.filter((h) => h.symbolName === 'W')
    expect(wildHits).toHaveLength(0)
    // B cluster includes the wilds (adj to B at (0,2)) but is a B hit
    const bHit = result.hits.find((h) => h.symbolName === 'B')
    expect(bHit).toBeDefined()
  })

  it('does not connect diagonal-only adjacent cells', () => {
    // A at (reel=0,row=0) and A at (reel=1,row=1): only diagonally adjacent → separate components
    // Each A cluster = size 1, below threshold → no hits
    const g = grid([
      ['A', 'B', 'B'],
      ['B', 'A', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    const result = evaluateClusters(g, ENGINE)
    const aHits = result.hits.filter((h) => h.symbolName === 'A')
    expect(aHits).toHaveLength(0)
  })

  it('computes totalWin as sum of all hit payouts', () => {
    // 3 A's = 10, large B cluster ≥ paytable max (6→100 for A, use B's payouts)
    const g = grid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    const result = evaluateClusters(g, ENGINE)
    let expected = 0
    for (const h of result.hits) expected += h.totalPayout
    expect(result.totalWin).toBeCloseTo(expected)
  })
})
