import { describe, expect, it } from 'bun:test'
import { evaluateSpin } from '../paylines/evaluator.js'
import { createSlotEngine } from '../paylines/slot-engine.js'
import { type EvalGrid } from '../spin-grid/spin-grid.js'

// 5x3 config with 3 horizontal paylines: row 0, row 1, row 2
const CONFIG = {
  reelCount: 5,
  rowCount: 3,
  wildSymbol: 'W',
  paytable: {
    A: { 3: 10, 4: 25, 5: 100 },
    B: { 3: 5, 4: 15, 5: 40 },
    C: { 3: 2, 4: 8, 5: 20 },
  },
  paylines: [{ rows: [0, 0, 0, 0, 0] }, { rows: [1, 1, 1, 1, 1] }, { rows: [2, 2, 2, 2, 2] }],
}

// Build engine with proper symbol IDs
const ENGINE = createSlotEngine(CONFIG)

function idFor(name: string): number {
  return ENGINE.symbols.toId.get(name) ?? -1
}

function makeIdGrid(symbols: string[][]): EvalGrid {
  return {
    reelCount: symbols.length,
    rowCount: symbols[0]?.length ?? 0,
    getSymbol(reel, row) {
      const name = symbols[reel]?.[row] ?? 'EMPTY'
      return idFor(name)
    },
    getMultiplier: () => 1,
  }
}

describe('evaluateSpin', () => {
  it('finds a winning payline for a full row of matching symbols', () => {
    const g = makeIdGrid([
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
    ])
    const result = evaluateSpin(g, ENGINE)
    // Payline 0 (row 0): 5 A's → payout 100
    // Payline 1 (row 1): 5 B's → payout 40
    // Payline 2 (row 2): 5 C's → payout 20
    expect(result.totalWin).toBe(160)
    expect(result.hits.length).toBe(3)
  })

  it('returns no hits when no matches reach minPayCount', () => {
    const g = makeIdGrid([
      ['A', 'A', 'B'],
      ['B', 'B', 'A'],
      ['C', 'C', 'C'],
      ['C', 'C', 'C'],
      ['C', 'C', 'C'],
    ])
    const result = evaluateSpin(g, ENGINE)
    // No row has 3+ matching symbols
    expect(result.hits).toHaveLength(0)
    expect(result.totalWin).toBe(0)
  })

  it('matches 3 symbols on first 3 reels (left-aligned)', () => {
    const g = makeIdGrid([
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['X', 'X', 'X'], // breaks chain
      ['X', 'X', 'X'],
    ])
    const result = evaluateSpin(g, ENGINE)
    // Payline 0: 3 A's on first 3 reels → payout 10
    // Payline 1: 3 B's on first 3 reels → payout 5
    // Payline 2: 3 C's on first 3 reels → payout 2
    expect(result.totalWin).toBe(17)
    expect(result.hits.length).toBe(3)
  })

  it('wild substitutes for the first non-wild symbol', () => {
    const g = makeIdGrid([
      ['W', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
    ])
    const result = evaluateSpin(g, ENGINE)
    // Payline 0: W on reel0 counts as A → 5 A matches → 100
    const hit0 = result.hits.find((h) => h.lineIndex === 0)
    expect(hit0).toBeDefined()
    expect(hit0!.matchCount).toBe(5)
    expect(hit0!.totalPayout).toBe(100)
  })

  it('wild-only line uses best wild payout', () => {
    // All reels have wild on row 0
    const g = makeIdGrid([
      ['W', 'B', 'C'],
      ['W', 'B', 'C'],
      ['W', 'B', 'C'],
      ['W', 'B', 'C'],
      ['W', 'B', 'C'],
    ])
    const result = evaluateSpin(g, ENGINE)
    // Payline 0: all wilds → findBestWildPayout for 5 matches
    // A at 5 pays 100, B at 5 pays 40 → best = 100
    const hit0 = result.hits.find((h) => h.lineIndex === 0)
    expect(hit0).toBeDefined()
    expect(hit0!.matchCount).toBe(5)
    expect(hit0!.symbolName).toBe('WILD')
  })

  it('matches partial paylines that share a prefix', () => {
    // Two paylines that diverge at the last reel
    const config2 = {
      reelCount: 5,
      rowCount: 3,
      wildSymbol: 'W',
      paytable: { A: { 3: 10, 4: 25, 5: 100 } },
      paylines: [{ rows: [0, 0, 0, 0, 0] }, { rows: [0, 0, 0, 0, 1] }],
    }
    const engine2 = createSlotEngine(config2)
    const g = makeIdGrid([
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      // reel 4: row 0 = X (breaks payline 0), row 1 = A (continues payline 1)
      ['EMPTY', 'A', 'C'],
    ])
    const result = evaluateSpin(g, engine2)
    // Payline 1: 5 A's → 100
    // Payline 0: 4 A's on first 4 reels → 25
    expect(result.totalWin).toBe(125)
    expect(result.hits.length).toBe(2)
  })

  it('emits subtree hits when chain breaks', () => {
    const config2 = {
      reelCount: 3,
      rowCount: 3,
      wildSymbol: 'W',
      paytable: { A: { 3: 10 } },
      paylines: [{ rows: [0, 0, 0] }, { rows: [0, 0, 1] }, { rows: [0, 0, 2] }],
    }
    const engine2 = createSlotEngine(config2)
    // reel0 row0=A, reel1 row0=A, reel2 row0=B (breaks), row1=C, row2=D
    const g = makeIdGrid([
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['B', 'C', 'D'],
    ])
    const result = evaluateSpin(g, engine2)
    // Paylines 0,1,2 share first 2 reels (A, A). At reel 2:
    // - row0=B breaks → subtree emit for plStart..plEnd
    // - row1=C also different → subtree emit
    // - row2=D → different → subtree emit
    // Only 2 A matches on first 2 reels → below minPayCount 3 → no hits
    expect(result.hits).toHaveLength(0)
    expect(result.totalWin).toBe(0)
  })

  it('returns totalWin matching sum of all hits', () => {
    const g = makeIdGrid([
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
    ])
    const result = evaluateSpin(g, ENGINE)
    let sum = 0
    for (const h of result.hits) sum += h.totalPayout
    expect(result.totalWin).toBe(sum)
  })

  it('handles grid with no matching symbols on paylines', () => {
    // Use symbol IDs that are not in the paytable — no payline can match
    const unknownId = 999
    const g: EvalGrid = {
      reelCount: 5,
      rowCount: 3,
      getSymbol: () => unknownId,
      getMultiplier: () => 1,
    }
    const result = evaluateSpin(g, ENGINE)
    // No paytable payouts for unknown symbol → no hits emitted
    expect(result.totalWin).toBe(0)
  })

  it('handles wild followed by matching symbol', () => {
    const g = makeIdGrid([
      ['W', 'B', 'C'],
      ['W', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
    ])
    const result = evaluateSpin(g, ENGINE)
    // Payline 0: W,W,A,A,A → baseSym A, 5 matches → 100
    const hit0 = result.hits.find((h) => h.lineIndex === 0)
    expect(hit0).toBeDefined()
    expect(hit0!.symbolName).toBe('A')
    expect(hit0!.matchCount).toBe(5)
  })

  it('handles single reel config', () => {
    const config1 = {
      reelCount: 1,
      rowCount: 3,
      wildSymbol: 'W',
      paytable: { A: { 1: 5, 3: 10 } },
      paylines: [{ rows: [0] }, { rows: [1] }, { rows: [2] }],
    }
    const engine1 = createSlotEngine(config1)
    const g = makeIdGrid([['A', 'B', 'A']])
    const result = evaluateSpin(g, engine1)
    // Payline 0 (row0): A matchCount 1 → payout 5
    // Payline 2 (row2): A matchCount 1 → payout 5
    expect(result.totalWin).toBe(10)
  })
})
