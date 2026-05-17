import { describe, it, expect } from 'bun:test'
import { createClusterSlotEngine } from '../cluster-engine'
import { evaluateClusters } from '../evaluator'
import { MutableCascadeGrid } from '../../cascade/cascade-grid'

describe('Cluster Evaluator', () => {
  const engine = createClusterSlotEngine({
    reelCount: 3,
    rowCount: 3,
    paytable: {
      RIFLE: { '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7 },
      BULLET: { '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7 },
    },
    wildSymbol: 'WILD',
  })

  const { toId } = engine.symbols
  const RIFLE = toId.get('RIFLE')!
  const BULLET = toId.get('BULLET')!
  const WILD = toId.get('WILD')!

  function createCleanGrid(reels: number, rows: number): MutableCascadeGrid {
    const grid = new MutableCascadeGrid(reels, rows)
    for (let r = 0; r < reels; r++) {
      for (let c = 0; c < rows; c++) {
        grid.setSymbol(r, c, -100) // Non-existent symbol
      }
    }
    return grid
  }

  it('should not combine different symbols into one cluster even if connected by wild', () => {
    const grid = createCleanGrid(3, 3)
    // Row 0: R, W, B
    // Row 1: R, B, B
    // Row 2: R, R, B
    grid.setSymbol(0, 0, RIFLE)
    grid.setSymbol(1, 0, WILD)
    grid.setSymbol(2, 0, BULLET)
    grid.setSymbol(0, 1, RIFLE)
    grid.setSymbol(1, 1, BULLET)
    grid.setSymbol(2, 1, BULLET)
    grid.setSymbol(0, 2, RIFLE)
    grid.setSymbol(1, 2, RIFLE)
    grid.setSymbol(2, 2, BULLET)

    const result = evaluateClusters(grid, engine)

    expect(result.hits.length).toBe(2)

    const rifleHit = result.hits.find((h) => h.symbolId === RIFLE)
    const bulletHit = result.hits.find((h) => h.symbolId === BULLET)

    expect(rifleHit).toBeDefined()
    expect(bulletHit).toBeDefined()

    // RIFLE positions: (0,0)->0, (0,1)->1, (0,2)->2, (1,2)->5. WILD at (1,0)->3.
    expect(rifleHit!.size).toBe(5)
    expect(rifleHit!.positions.slice().sort()).toEqual([0, 1, 2, 3, 5].sort())

    // BULLET positions: (2,0)->6, (1,1)->4, (2,1)->7, (2,2)->8. WILD at (1,0)->3.
    expect(bulletHit!.size).toBe(5)
    expect(bulletHit!.positions.slice().sort()).toEqual([3, 4, 6, 7, 8].sort())
  })

  it('should not pay for pure-wild clusters', () => {
    const grid = new MutableCascadeGrid(3, 3)
    for (let i = 0; i < 9; i++) grid.setSymbol(Math.floor(i / 3), i % 3, WILD)
    const result = evaluateClusters(grid, engine)
    expect(result.hits.length).toBe(0)
    expect(result.totalWin).toBe(0)
  })

  it('should respect minPayCount', () => {
    const grid = createCleanGrid(3, 3)
    grid.setSymbol(0, 0, RIFLE)
    grid.setSymbol(1, 0, RIFLE)
    const result = evaluateClusters(grid, engine)
    expect(result.hits.length).toBe(0)
  })

  it('should collect scattered symbols of the same type if not connected', () => {
    const grid = createCleanGrid(3, 3)
    grid.setSymbol(0, 0, RIFLE)
    grid.setSymbol(2, 0, RIFLE)
    grid.setSymbol(0, 2, RIFLE)
    grid.setSymbol(2, 2, RIFLE)
    const result = evaluateClusters(grid, engine)
    expect(result.hits.length).toBe(0)
  })

  it('should ignore scatter symbols during cluster evaluation', () => {
    const SCATTER = 11
    const localEngine = createClusterSlotEngine({
      reelCount: 3,
      rowCount: 3,
      paytable: { RIFLE: { '3': 1 } },
      wildSymbol: 'WILD',
      scatterDefinition: { symbolId: SCATTER, payouts: [] },
    })
    const grid = createCleanGrid(3, 3)
    grid.setSymbol(0, 0, RIFLE)
    grid.setSymbol(1, 0, SCATTER)
    grid.setSymbol(2, 0, RIFLE)
    grid.setSymbol(1, 1, RIFLE)
    const result = evaluateClusters(grid, localEngine)
    expect(result.hits.length).toBe(0)
  })

  it('should correctly handle a large snake-like cluster', () => {
    const grid = createCleanGrid(3, 3)
    grid.setSymbol(0, 0, RIFLE)
    grid.setSymbol(1, 0, RIFLE)
    grid.setSymbol(2, 0, RIFLE)
    grid.setSymbol(2, 1, RIFLE)
    grid.setSymbol(0, 2, RIFLE)
    grid.setSymbol(1, 2, RIFLE)
    grid.setSymbol(2, 2, RIFLE)
    const result = evaluateClusters(grid, engine)
    expect(result.hits.length).toBe(1)
    expect(result.hits[0]!.size).toBe(7)
  })

  it('should correctly report multiple hits of the same symbol if disconnected', () => {
    const largeEngine = createClusterSlotEngine({
      reelCount: 4,
      rowCount: 4,
      paytable: { RIFLE: { '3': 10 } },
      wildSymbol: 'WILD',
    })
    const LARGE_RIFLE = largeEngine.symbols.toId.get('RIFLE')!
    const largeGrid = new MutableCascadeGrid(4, 4)
    for (let i = 0; i < 16; i++) largeGrid.setSymbol(Math.floor(i / 4), i % 4, -1)
    largeGrid.setSymbol(0, 0, LARGE_RIFLE)
    largeGrid.setSymbol(1, 0, LARGE_RIFLE)
    largeGrid.setSymbol(2, 0, LARGE_RIFLE)
    largeGrid.setSymbol(0, 3, LARGE_RIFLE)
    largeGrid.setSymbol(1, 3, LARGE_RIFLE)
    largeGrid.setSymbol(2, 3, LARGE_RIFLE)
    const result = evaluateClusters(largeGrid, largeEngine)
    expect(result.hits.length).toBe(2)
    expect(result.totalWin).toBe(20)
  })

  it('should correctly handle overlapping clusters sharing a wild', () => {
    const grid = createCleanGrid(3, 3)
    // Row 0: R, R, R
    // Row 1: ., W, .
    // Row 2: B, B, B
    grid.setSymbol(0, 0, RIFLE)
    grid.setSymbol(1, 0, RIFLE)
    grid.setSymbol(2, 0, RIFLE)
    grid.setSymbol(1, 1, WILD)
    grid.setSymbol(0, 2, BULLET)
    grid.setSymbol(1, 2, BULLET)
    grid.setSymbol(2, 2, BULLET)
    const result = evaluateClusters(grid, engine)
    expect(result.hits.length).toBe(2)
    const rHit = result.hits.find((h) => h.symbolId === RIFLE)!
    const bHit = result.hits.find((h) => h.symbolId === BULLET)!
    expect(rHit.size).toBe(4)
    expect(bHit.size).toBe(4)
    expect(rHit.positions).toContain(4) // WILD pos
    expect(bHit.positions).toContain(4) // WILD pos
  })

  it('should never include different non-wild symbols in the same ClusterHit', () => {
    const localEngine = createClusterSlotEngine({
      reelCount: 6,
      rowCount: 5,
      paytable: { RIFLE: { '5': 1 }, BULLET: { '5': 1 } },
      wildSymbol: 'WILD',
    })
    const { toId } = localEngine.symbols
    const L_RIFLE = toId.get('RIFLE')!
    const L_BULLET = toId.get('BULLET')!
    const L_WILD = toId.get('WILD')!
    const grid = createCleanGrid(6, 5)
    for (let reel = 0; reel < 6; reel++) {
      for (let row = 0; row < 5; row++) {
        const rnd = Math.random()
        if (rnd < 0.2) grid.setSymbol(reel, row, L_WILD)
        else if (rnd < 0.5) grid.setSymbol(reel, row, L_RIFLE)
        else grid.setSymbol(reel, row, L_BULLET)
      }
    }
    const result = evaluateClusters(grid, localEngine)
    for (const hit of result.hits) {
      const targetSym = hit.symbolId
      for (const pos of hit.positions) {
        const sym = grid.getSymbol(Math.floor(pos / 5), pos % 5)
        expect(sym === targetSym || sym === L_WILD).toBe(true)
      }
    }
  })

  it('should ignore special symbols S300 and SCATTER', () => {
    const S300 = 10
    const SCATTER = 11
    const localEngine = createClusterSlotEngine({
      reelCount: 6,
      rowCount: 5,
      paytable: { RIFLE: { '5': 1 } },
      wildSymbol: 'WILD',
      scatterDefinition: { symbolId: SCATTER, payouts: [] },
    })
    const grid = createCleanGrid(6, 5)
    grid.setSymbol(0, 0, RIFLE)
    grid.setSymbol(1, 0, RIFLE)
    grid.setSymbol(0, 1, S300)
    grid.setSymbol(1, 1, SCATTER)
    grid.setSymbol(0, 2, RIFLE)
    grid.setSymbol(1, 2, RIFLE)
    grid.setSymbol(2, 2, RIFLE)
    const result = evaluateClusters(grid, localEngine)
    expect(result.hits.length).toBe(0)
  })

  it('should correctly calculate total win when multiple symbols share a wild', () => {
    const localEngine = createClusterSlotEngine({
      reelCount: 3,
      rowCount: 1,
      paytable: { RIFLE: { '2': 10 }, BULLET: { '2': 5 } },
      wildSymbol: 'WILD',
    })
    const { toId } = localEngine.symbols
    const L_RIFLE = toId.get('RIFLE')!
    const L_BULLET = toId.get('BULLET')!
    const L_WILD = toId.get('WILD')!
    const grid = createCleanGrid(3, 1)
    grid.setSymbol(0, 0, L_RIFLE)
    grid.setSymbol(1, 0, L_WILD)
    grid.setSymbol(2, 0, L_BULLET)
    const result = evaluateClusters(grid, localEngine)
    expect(result.hits.length).toBe(2)
    expect(result.totalWin).toBe(15)
  })

  it('should handle very large clusters filling the entire grid', () => {
    const grid = createCleanGrid(6, 5)
    for (let reel = 0; reel < 6; reel++) {
      for (let row = 0; row < 5; row++) {
        grid.setSymbol(reel, row, RIFLE)
      }
    }
    const localEngine = createClusterSlotEngine({
      reelCount: 6,
      rowCount: 5,
      paytable: { RIFLE: { '30': 1000 } },
      wildSymbol: 'WILD',
    })
    const result = evaluateClusters(grid, localEngine)
    expect(result.hits.length).toBe(1)
    expect(result.hits[0]!.size).toBe(30)
    expect(result.totalWin).toBe(1000)
  })
})
