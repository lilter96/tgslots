import { expect, test } from 'bun:test'
import { CascadeEngine } from '../cascade/cascade-engine'
import { MutableCascadeGrid } from '../cascade/cascade-grid'
import { createClusterSlotEngine } from '../cluster/cluster-engine'
const engine = createClusterSlotEngine({
  reelCount: 3,
  rowCount: 2,
  wildSymbol: 'WILD',
  paytable: { A: { 6: 20 }, B: {} },
})
test('opt-in animation snapshots are independent of final mutable grid', () => {
  const grid = new MutableCascadeGrid(3, 2)
  for (let reel = 0; reel < 3; reel++)
    for (let row = 0; row < 2; row++) grid.setSymbol(reel, row, 1)
  const result = new CascadeEngine(engine, { maxSteps: 1, captureGrids: true }).run(grid, {
    drawNext: () => 2,
  })
  expect(result.steps[0]!.before).toEqual([
    [1, 1],
    [1, 1],
    [1, 1],
  ])
  expect(result.steps[0]!.after).toEqual([
    [2, 2],
    [2, 2],
    [2, 2],
  ])
  ;(result.finalGrid as MutableCascadeGrid).setSymbol(0, 0, 0)
  expect(result.steps[0]!.after![0]![0]).toBe(2)
  const lean = new CascadeEngine(engine, { maxSteps: 1 }).run(grid, { drawNext: () => 2 })
  expect(lean.steps[0]!.before).toBeUndefined()
  expect(lean.steps[0]!.after).toBeUndefined()
})
