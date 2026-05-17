import { describe, expect, it } from 'bun:test'
import { createClusterSlotEngine } from '../cluster-engine'
import { evaluateClusters } from '../evaluator'
import { MutableCascadeGrid } from '../../cascade/cascade-grid'
import { EMPTY_SYMBOL } from '../../symbol-registry.ts'

describe('Cluster Evaluator - Advanced Suite', () => {
  function createFullPaytable(base: Record<string, number>, max: number) {
    const res: Record<string, number> = { ...base }
    const maxKey = Math.max(...Object.keys(base).map(Number))
    const maxVal = base[maxKey.toString()]!
    for (let i = maxKey + 1; i <= max; i++) {
      res[i.toString()] = maxVal
    }
    return res
  }

  const engine = createClusterSlotEngine({
    reelCount: 5,
    rowCount: 5,
    paytable: {
      RIFLE: createFullPaytable(
        { '3': 10, '4': 20, '5': 50, '6': 100, '7': 200, '8': 500, '9': 1000 },
        25,
      ),
      BULLET: createFullPaytable(
        { '3': 5, '4': 10, '5': 25, '6': 50, '7': 100, '8': 250, '9': 500 },
        25,
      ),
    },
    wildSymbol: 'WILD',
    scatterDefinition: { symbolId: 11, payouts: [] },
  })

  const strictEngine = createClusterSlotEngine({
    reelCount: 5,
    rowCount: 5,
    paytable: {
      RIFLE: createFullPaytable({ '3': 10, '4': 20, '5': 50 }, 25),
      BULLET: createFullPaytable({ '3': 5, '4': 10, '5': 25 }, 25),
    },
    wildSymbol: 'WILD',
    disallowMixedWilds: true,
  })

  function buildGrid(asciiLayout: string[], targetEngine = engine): MutableCascadeGrid {
    const { reelCount, rowCount } = targetEngine
    const grid = new MutableCascadeGrid(reelCount, rowCount)
    const { toId } = targetEngine.symbols

    for (let r = 0; r < reelCount; r++) {
      for (let c = 0; c < rowCount; c++) {
        grid.setSymbol(r, c, EMPTY_SYMBOL)
      }
    }

    const inputRows = asciiLayout.length
    const parsedRows = asciiLayout.map((row) => row.replace(/\s/g, ''))

    for (let row = 0; row < inputRows; row++) {
      const inputCols = parsedRows[row]!.length
      for (let reel = 0; reel < inputCols; reel++) {
        if (reel >= reelCount || row >= rowCount) continue

        const char = parsedRows[row]![reel]!
        let symId = EMPTY_SYMBOL

        if (char === 'R') symId = toId.get('RIFLE')!
        else if (char === 'B') symId = toId.get('BULLET')!
        else if (char === 'W') symId = toId.get('WILD')!
        else if (char === 'S') symId = targetEngine.scatterId ?? 11
        else if (char === 'G') symId = toId.get('GRENADE')!
        else if (char === 'M') symId = toId.get('MEDKIT')!
        else if (char === '.') symId = EMPTY_SYMBOL

        grid.setSymbol(reel, row, symId)
      }
    }
    return grid
  }

  describe('1. Connectivity & Geometry', () => {
    it('strict 4-way connect: diagonals should NOT form a cluster', () => {
      const grid = buildGrid(['R . .', '. R .', '. . R'])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(0)
    })

    it('the donut shape: hollow cluster should connect perfectly', () => {
      const grid = buildGrid(['R R R', 'R B R', 'R R R'])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(1)
      expect(result.hits[0]!.symbolName).toBe('RIFLE')
      expect(result.hits[0]!.size).toBe(8)
    })

    it('the snake shape: long winding cluster touching all corners', () => {
      const grid = buildGrid(['R R R R R', '. . . . R', 'R R R R R', 'R . . . .', 'R R R R R'])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(1)
      expect(result.hits[0]!.size).toBe(17)
    })

    it('multiple disjoint clusters of the SAME symbol must be separate hits', () => {
      const grid = buildGrid(['R R . R R', 'R R . R R'])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(2)
      expect(result.hits[0]!.symbolName).toBe('RIFLE')
      expect(result.hits[1]!.symbolName).toBe('RIFLE')
      expect(result.hits[0]!.size).toBe(4)
      expect(result.hits[1]!.size).toBe(4)
      expect(result.totalWin).toBe(40)
    })
  })

  describe('2. Advanced Wild Interactions', () => {
    it('wild bridge: single wild connects disjoint parts of the same symbol', () => {
      const grid = buildGrid(['R R W R R'])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(1)
      expect(result.hits[0]!.size).toBe(5)
    })

    it('wild crossroads: wild at intersection serves multiple symbols (default behavior)', () => {
      const grid = buildGrid(['. R .', 'B W B', '. R .'])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(2)

      const rHit = result.hits.find((h) => h.symbolName === 'RIFLE')!
      const bHit = result.hits.find((h) => h.symbolName === 'BULLET')!

      expect(rHit.size).toBe(3)
      expect(bHit.size).toBe(3)
    })

    it('pure wild grid should yield NOTHING', () => {
      const grid = buildGrid(['W W W', 'W W W', 'W W W'])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(0)
    })
  })

  describe('3. disallowMixedWilds Engine Rule', () => {
    it('first evaluated symbol claims the wild, second fails if below min size', () => {
      const grid = buildGrid(['R W B', 'R W B', 'R . B'], strictEngine)

      const result = evaluateClusters(grid, strictEngine)

      expect(result.hits.length).toBe(2)
      const rHit = result.hits.find((h) => h.symbolName === 'RIFLE')!
      const bHit = result.hits.find((h) => h.symbolName === 'BULLET')!

      expect(rHit.size).toBe(5)
      expect(bHit.size).toBe(3)
    })

    it('a losing cluster must NOT consume a wild', () => {
      const grid = buildGrid(['R W B B'], strictEngine)

      const result = evaluateClusters(grid, strictEngine)

      expect(result.hits.length).toBe(1)
      expect(result.hits[0]!.symbolName).toBe('BULLET')
      expect(result.hits[0]!.size).toBe(3)
    })
  })

  describe('4. Edge Cases & Boundary Safety', () => {
    it('ignores completely empty fields', () => {
      const grid = buildGrid(['. . .', '. . .', '. . .'])
      expect(evaluateClusters(grid, engine).hits.length).toBe(0)
    })

    it('scatter symbol does not bridge clusters', () => {
      const grid = buildGrid(['R R S R R'])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(0)
    })

    it('massive payout fallback: size exceeding paytable gets highest available', () => {
      const grid = buildGrid([
        'R R R R R',
        'R R R R R',
        'R R R R R', // 15 RIFLE symbols
      ])
      const result = evaluateClusters(grid, engine)
      expect(result.hits.length).toBe(1)
      expect(result.hits[0]!.size).toBe(15)
      expect(result.hits[0]!.basePayout).toBe(1000)
    })
  })

  describe('5. MASTERCLASS: Hardcore Logic & Engine Weakpoints', () => {
    it('MASTER TEST 1: The 1D-to-2D Array Boundary Illusion', () => {
      const grid = buildGrid(
        [
          '. R . . .', // (1, 0) - index 5
          '. R . . .', // (1, 1) - index 6
          '. . . . .',
          'R . . . .', // (0, 3) - index 3
          'R . . . .', // (0, 4) - index 4
        ],
        engine,
      )

      const result = evaluateClusters(grid, engine)

      expect(result.hits.length).toBe(0)
    })

    it('MASTER TEST 2: The Scan-Order Theft (Strict Wilds)', () => {
      const grid = buildGrid(
        [
          '. B B . .',
          'R W . . .', // W (1,1). R (0,1).
          'R B B . .', // W (1,0) + (1,2).
          '. . . . .',
          '. . . . .',
        ],
        strictEngine,
      )

      const result = evaluateClusters(grid, strictEngine)

      expect(result.hits.length).toBe(1) // Выиграл только R!
      expect(result.hits[0]!.symbolName).toBe('RIFLE')
      expect(result.hits[0]!.size).toBe(3) // 2 'R' + 1 'W'

      const bulletHit = result.hits.find((h) => h.symbolName === 'BULLET')
      expect(bulletHit).toBeUndefined()
    })

    it('MASTER TEST 3: The Omni-Directional Wild Core (Default Behavior)', () => {
      const omniEngine = createClusterSlotEngine({
        reelCount: 5,
        rowCount: 5,
        paytable: {
          RIFLE: { '4': 100 },
          BULLET: { '4': 100 },
          GRENADE: { '4': 100 },
          MEDKIT: { '4': 100 },
        },
        wildSymbol: 'WILD',
      })

      const grid = buildGrid(
        [
          '. . R . .',
          '. B R R G',
          'B B W G G', // <--- Center (2,2)
          '. . M M .',
          '. . M . .',
        ],
        omniEngine,
      )

      const result = evaluateClusters(grid, omniEngine)

      expect(result.hits.length).toBe(4)

      const symbolsWon = result.hits.map((h) => h.symbolName).sort()
      expect(symbolsWon).toEqual(['BULLET', 'GRENADE', 'MEDKIT', 'RIFLE'])

      for (const hit of result.hits) {
        expect(hit.size).toBe(4)
        expect(hit.positions).toContain(12)
      }
    })
  })
})
