// ── Cascade Engine + Sampler Tests ────────────────────────────────

import { describe, expect, it } from 'bun:test'
import { Sampler } from '@tgslots/math/probability'
import { createClusterSlotEngine } from '../cluster/cluster-engine.js'
import { evaluateClusters } from '../cluster/evaluator.js'
import { CascadeEngine } from '../cascade/cascade-engine.js'
import { MutableCascadeGrid } from '../cascade/cascade-grid.js'
import { collectVanishPositions } from '../cascade/vanishing.js'
import { createCascadeSampler } from '../cascade/sampler.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'
import { EMPTY_SYMBOL } from '../symbol-registry.js'
import type { RefillSource } from '../cascade/types.js'

// ---------------------------------------------------------------------------
// Shared engine + helpers
// ---------------------------------------------------------------------------

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

const { reelCount, rowCount } = ENGINE
const pos = (reel: number, row: number) => reel * rowCount + row

function makeGrid(rows: string[][]): MutableCascadeGrid {
  const grid = new MutableCascadeGrid(reelCount, rowCount)
  for (let r = 0; r < reelCount; r++) {
    for (let c = 0; c < rowCount; c++) {
      const name = rows[r]?.[c] ?? 'EMPTY'
      if (name === 'EMPTY') {
        grid.setSymbol(r, c, EMPTY_SYMBOL)
      } else {
        const id = ENGINE.symbols.toId.get(name)
        if (id === undefined) throw new Error(`Unknown symbol: ${name}`)
        grid.setSymbol(r, c, id)
      }
    }
  }
  return grid
}

function makeRefill(perReel: string[][]): RefillSource {
  const queues = perReel.map((names) =>
    names.map((n) => ENGINE.symbols.toId.get(n) ?? EMPTY_SYMBOL),
  )
  const idxs = perReel.map(() => 0)
  return {
    drawNext(reel) {
      const q = queues[reel]!
      const i = idxs[reel]!
      const id = q[i]
      idxs[reel] = i + 1
      return id !== undefined ? id : EMPTY_SYMBOL
    },
  }
}

// ---------------------------------------------------------------------------
// MutableCascadeGrid
// ---------------------------------------------------------------------------

describe('MutableCascadeGrid', () => {
  it('fromProjection copies grid symbols', () => {
    const original: EvalGrid = makeGrid([
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
    ])
    const copy = MutableCascadeGrid.fromProjection(original)
    for (let r = 0; r < reelCount; r++) {
      for (let c = 0; c < rowCount; c++) {
        expect(copy.getSymbol(r, c)).toBe(original.getSymbol(r, c))
      }
    }
  })

  it('clearAt marks positions as EMPTY_SYMBOL', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['A', 'A', 'A'],
    ])
    grid.clearAt([pos(0, 0), pos(0, 1), pos(2, 0)])
    expect(grid.getSymbol(0, 0)).toBe(EMPTY_SYMBOL)
    expect(grid.getSymbol(0, 1)).toBe(EMPTY_SYMBOL)
    expect(grid.getSymbol(2, 0)).toBe(EMPTY_SYMBOL)
    expect(grid.getSymbol(0, 2)).toBe(ENGINE.symbols.toId.get('A')!)
  })

  it('applyGravity compacts surviving symbols downward and refills the top', () => {
    const aId = ENGINE.symbols.toId.get('A')!
    const bId = ENGINE.symbols.toId.get('B')!
    // Reel 0: row0=A, row1=EMPTY, row2=A → gravity → row0=B(refill), row1=A, row2=A
    const grid = new MutableCascadeGrid(reelCount, rowCount)
    grid.setSymbol(0, 0, aId)
    grid.setSymbol(0, 1, EMPTY_SYMBOL)
    grid.setSymbol(0, 2, aId)
    for (let r = 1; r < reelCount; r++) {
      for (let c = 0; c < rowCount; c++) grid.setSymbol(r, c, bId)
    }
    grid.applyGravity(() => bId)
    expect(grid.getSymbol(0, 0)).toBe(bId) // refilled
    expect(grid.getSymbol(0, 1)).toBe(aId) // fell
    expect(grid.getSymbol(0, 2)).toBe(aId) // stayed
  })

  it('applyGravity fully refills an all-empty reel', () => {
    const aId = ENGINE.symbols.toId.get('A')!
    const bId = ENGINE.symbols.toId.get('B')!
    const grid = new MutableCascadeGrid(reelCount, rowCount)
    for (let c = 0; c < rowCount; c++) grid.setSymbol(0, c, EMPTY_SYMBOL)
    for (let r = 1; r < reelCount; r++) {
      for (let c = 0; c < rowCount; c++) grid.setSymbol(r, c, bId)
    }
    grid.applyGravity((reel) => (reel === 0 ? aId : bId))
    for (let c = 0; c < rowCount; c++) {
      expect(grid.getSymbol(0, c)).toBe(aId)
    }
  })

  it('applyGravity leaves a fully populated reel unchanged', () => {
    const aId = ENGINE.symbols.toId.get('A')!
    const bId = ENGINE.symbols.toId.get('B')!
    const grid = new MutableCascadeGrid(reelCount, rowCount)
    for (let r = 0; r < reelCount; r++) {
      for (let c = 0; c < rowCount; c++) grid.setSymbol(r, c, aId)
    }
    grid.applyGravity(() => bId) // refill never called for full reels
    for (let r = 0; r < reelCount; r++) {
      for (let c = 0; c < rowCount; c++) {
        expect(grid.getSymbol(r, c)).toBe(aId)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// collectVanishPositions
// ---------------------------------------------------------------------------

describe('collectVanishPositions', () => {
  it('returns empty array when there are no hits', () => {
    const grid = makeGrid([
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
    ])
    expect(collectVanishPositions([], grid, ENGINE)).toHaveLength(0)
  })

  it('includes isolated same-type cells outside the cluster', () => {
    // reel0: A cluster (3 cells). reel4 row0: isolated A not part of the cluster.
    // Both A regions should vanish (spec: "all contributing symbols + matching types visible").
    const g = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['A', 'B', 'B'],
    ])
    const { hits } = evaluateClusters(g, ENGINE)
    const aHits = hits.filter((h) => h.symbolName === 'A')
    const vanish = collectVanishPositions(aHits, g, ENGINE)
    const vanishSet = new Set(vanish)
    // All A cluster cells vanish
    for (let row = 0; row < rowCount; row++) expect(vanishSet.has(pos(0, row))).toBe(true)
    // Isolated A at (4, 0) also vanishes
    expect(vanishSet.has(pos(4, 0))).toBe(true)
    // Wilds are not vanished (none in this grid, but B's are not in aHits' winningSymbols)
    expect(vanishSet.has(pos(1, 0))).toBe(false)
  })

  it('keeps wilds outside winning clusters', () => {
    const wildId = ENGINE.symbols.wildId
    const aId = ENGINE.symbols.toId.get('A')!
    const bId = ENGINE.symbols.toId.get('B')!
    const g = new MutableCascadeGrid(reelCount, rowCount)
    // reel0: all A (cluster)
    for (let c = 0; c < rowCount; c++) g.setSymbol(0, c, aId)
    // reel1: all B (separates A from wild)
    for (let c = 0; c < rowCount; c++) g.setSymbol(1, c, bId)
    // reel2: wild at row0, B elsewhere
    g.setSymbol(2, 0, wildId)
    g.setSymbol(2, 1, bId)
    g.setSymbol(2, 2, bId)
    // reels 3-4: B
    for (let r = 3; r < reelCount; r++) {
      for (let c = 0; c < rowCount; c++) g.setSymbol(r, c, bId)
    }
    const { hits } = evaluateClusters(g, ENGINE)
    // Only collect A-cluster hits for this assertion
    const aHits = hits.filter((h) => h.symbolName === 'A')
    const vanish = collectVanishPositions(aHits, g, ENGINE)
    const vanishSet = new Set(vanish)
    // Wild at (2,0) is not reachable from the A cluster (B at reel1 blocks it) → stays
    expect(vanishSet.has(pos(2, 0))).toBe(false)
    // A's should vanish
    for (let c = 0; c < rowCount; c++) expect(vanishSet.has(pos(0, c))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// CascadeEngine
// ---------------------------------------------------------------------------

describe('CascadeEngine', () => {
  const engine = new CascadeEngine(ENGINE)

  it('returns a single no-win step when grid has no winning cluster', () => {
    // Alternating pattern — no cluster ≥ 3
    const g = makeGrid([
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
    ])
    const result = engine.run(g, makeRefill([[], [], [], [], []]))
    expect(result.totalWin).toBe(0)
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0]!.stepWin).toBe(0)
  })

  it('records the correct vanished positions in the step', () => {
    const g = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    // Refill all with EMPTY so no second cluster forms
    const refill: RefillSource = { drawNext: () => EMPTY_SYMBOL }
    const result = engine.run(g, refill)
    const vanishedSet = new Set(result.steps[0]!.vanished)
    for (let c = 0; c < rowCount; c++) expect(vanishedSet.has(pos(0, c))).toBe(true)
  })

  it('accumulates totalWin over a chained two-step cascade', () => {
    // Step 1: reel0 all A → payout 10
    // After refill reel0 gets 3 A's again → step 2 payout 10
    // After step-2 refill reel0 gets B's → no more A wins
    const g = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    // Refill: first 3 draws for reel0 are A (re-creates cluster), then B
    const refill = makeRefill([
      ['A', 'A', 'A', 'B', 'B', 'B'],
      ['B', 'B', 'B', 'B', 'B', 'B'],
      ['B', 'B', 'B', 'B', 'B', 'B'],
      ['B', 'B', 'B', 'B', 'B', 'B'],
      ['B', 'B', 'B', 'B', 'B', 'B'],
    ])
    const result = engine.run(g, refill)
    // At minimum we expect the two A-cluster payouts
    expect(result.steps.length).toBeGreaterThanOrEqual(2)
    // Each A cluster at size 3 pays 10
    const aStepWins = result.steps
      .filter((s) => s.evaluation.hits.some((h) => h.symbolName === 'A'))
      .map((s) => s.stepWin)
    expect(aStepWins.length).toBeGreaterThanOrEqual(2)
    aStepWins.forEach((w) => expect(w).toBeGreaterThanOrEqual(10))
    expect(result.totalWin).toBeGreaterThanOrEqual(20)
  })

  it('respects maxSteps cap', () => {
    const g = makeGrid([
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
    ])
    const aId = ENGINE.symbols.toId.get('A')!
    const capped = new CascadeEngine(ENGINE, { maxSteps: 3 })
    const result = capped.run(g, { drawNext: () => aId })
    expect(result.steps.length).toBeLessThanOrEqual(3)
  })

  it('finalGrid reflects the post-cascade state', () => {
    // Single 2-reel mini-engine for simplicity
    const mini = createClusterSlotEngine({
      reelCount: 2,
      rowCount: 3,
      wildSymbol: 'W',
      paytable: { A: { 3: 10 } },
    })
    const aId = mini.symbols.toId.get('A')!
    const bId = 1 // there's only A registered; use a raw id that's not A
    const g = new MutableCascadeGrid(2, 3)
    for (let c = 0; c < 3; c++) g.setSymbol(0, c, aId)
    for (let c = 0; c < 3; c++) g.setSymbol(1, c, EMPTY_SYMBOL)

    const miniCascade = new CascadeEngine(mini)
    // Refill with something that doesn't create a new win (out-of-range id → EMPTY_SYMBOL treated as no win)
    const result = miniCascade.run(g, { drawNext: () => EMPTY_SYMBOL })
    // A's should have vanished after step 1
    for (let c = 0; c < 3; c++) {
      expect(result.finalGrid.getSymbol(0, c)).not.toBe(aId)
    }
    void bId
  })
})

// ---------------------------------------------------------------------------
// createCascadeSampler
// ---------------------------------------------------------------------------

describe('createCascadeSampler', () => {
  it('produces the same totalWin as CascadeEngine.run with pure refill samplers', () => {
    // Single-step scenario: only A pays. After A vanishes, refill with EMPTY → no further wins.
    // This isolates the comparison from infinite-cascade divergence.
    const miniEngine = createClusterSlotEngine({
      reelCount: 5,
      rowCount: 3,
      wildSymbol: 'W',
      paytable: { A: { 3: 10, 4: 20, 5: 50 } }, // only A has payouts
    })
    const aId = miniEngine.symbols.toId.get('A')!

    const g = new MutableCascadeGrid(5, 3)
    for (let c = 0; c < 3; c++) g.setSymbol(0, c, aId) // 3-cell A cluster on reel 0
    for (let r = 1; r < 5; r++) {
      for (let c = 0; c < 3; c++) g.setSymbol(r, c, EMPTY_SYMBOL)
    }

    // Refill with EMPTY → no second winning cluster.
    const refillSamplers = Array.from({ length: 5 }, () => Sampler.pure<number>(EMPTY_SYMBOL))
    const cascadeSampler = createCascadeSampler(
      miniEngine,
      Sampler.pure<EvalGrid>(g),
      refillSamplers,
    )
    const r1 = cascadeSampler.sample(() => 0)

    const syncEngine = new CascadeEngine(miniEngine)
    const syncResult = syncEngine.run(g, { drawNext: () => EMPTY_SYMBOL })

    expect(r1.totalWin).toBe(syncResult.totalWin) // both = 10 (A size-3 payout)
    expect(r1.steps.length).toBe(syncResult.steps.length)
  })

  it('is deterministic when sampled twice with pure samplers', () => {
    const g = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
    ])
    const refillSamplers = Array.from({ length: reelCount }, () =>
      Sampler.pure<number>(EMPTY_SYMBOL),
    )
    const sampler = createCascadeSampler(ENGINE, Sampler.pure<EvalGrid>(g), refillSamplers)
    const rng = () => 0
    const r1 = sampler.sample(rng)
    const r2 = sampler.sample(rng)
    expect(r1.totalWin).toBe(r2.totalWin)
    expect(r1.steps.length).toBe(r2.steps.length)
  })

  it('throws if refillSamplers length does not match reelCount', () => {
    const g = makeGrid([
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
    ])
    expect(() => createCascadeSampler(ENGINE, Sampler.pure<EvalGrid>(g), [])).toThrow()
  })
})
