import { expect, test } from 'bun:test'
import { evaluateClusters, MutableCascadeGrid } from '@tgslots/slots-core'
import { engine } from '@tgslots/le-militare/engine'
import { SYM_NAMES, SCATTER_ID, WILD_ID } from '@tgslots/le-militare/constants'
import { manifest } from '../../games/le-militare/manifest.js'
import { gameRules } from '../../app/game-rules.js'

// Authoring JSON is the reference, independent of the compiled cluster paytable.
// Each row-major prefix forms one orthogonally connected component.
test('Le Militare: every symbol and cluster size, with a wild at every position', () => {
  let cases = 0
  for (const [name, pays] of Object.entries(gameRules['le-militare']!.paytable)) {
    const id = SYM_NAMES.indexOf(name as (typeof SYM_NAMES)[number])
    expect(engine.symbols.toId.get(name)).toBe(id)
    for (let size = 6; size <= 30; size++) {
      for (let wildPosition = 0; wildPosition < size; wildPosition++) {
        const grid = new MutableCascadeGrid(6, 5)
        for (let position = 0; position < 30; position++) {
          grid.setSymbol(
            position % 6,
            Math.floor(position / 6),
            position < size ? (position === wildPosition ? WILD_ID : id) : SCATTER_ID,
          )
        }
        const result = evaluateClusters(grid, engine)
        expect(result.hits.length).toBe(1)
        expect(result.hits[0]!.symbolName).toBe(name)
        expect(result.hits[0]!.size).toBe(size)
        expect(result.totalWin).toBe(pays[String(size)]!)
        cases++
      }
    }
  }
  expect(cases).toBe(4050)
  for (const symbol of manifest.symbols) expect(String(SYM_NAMES[symbol.id])).toBe(symbol.name)
})

test('Le Militare: non-paying symbols and isolated cells do not become paid clusters', () => {
  for (const symbol of [WILD_ID, SCATTER_ID, 10]) {
    const grid = new MutableCascadeGrid(6, 5)
    for (let reel = 0; reel < 6; reel++)
      for (let row = 0; row < 5; row++) grid.setSymbol(reel, row, symbol)
    expect(evaluateClusters(grid, engine).totalWin).toBe(0)
  }
  const diagonal = new MutableCascadeGrid(6, 5)
  for (let reel = 0; reel < 6; reel++)
    for (let row = 0; row < 5; row++)
      diagonal.setSymbol(reel, row, (reel + row) % 2 === 0 ? 1 : SCATTER_ID)
  expect(evaluateClusters(diagonal, engine).totalWin).toBe(0)
})
