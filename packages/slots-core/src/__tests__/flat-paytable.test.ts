import { describe, expect, it } from 'bun:test'
import { buildFlatPaytable, findBestWildPayout } from '../paytable/flat-paytable.js'
import { createSymbolRegistry } from '../symbol-registry.js'

describe('buildFlatPaytable', () => {
  it('builds a flat paytable from config', () => {
    const config = {
      A: { 3: 10, 4: 20, 5: 50 },
      B: { 3: 5, 4: 15 },
    }
    const registry = createSymbolRegistry(['A', 'B'], 'W')
    const table = buildFlatPaytable(config, registry, 5)

    const aId = registry.toId.get('A')!
    const bId = registry.toId.get('B')!
    expect(table.payouts[aId]![3]).toBe(10)
    expect(table.payouts[aId]![4]).toBe(20)
    expect(table.payouts[aId]![5]).toBe(50)
    expect(table.payouts[bId]![3]).toBe(5)
    expect(table.payouts[bId]![4]).toBe(15)
  })

  it('calculates minPayCount correctly', () => {
    const config = {
      A: { 3: 10, 5: 50 },
      B: { 4: 15 },
    }
    const registry = createSymbolRegistry(['A', 'B'], 'W')
    const table = buildFlatPaytable(config, registry, 5)
    expect(table.minPayCount).toBe(3) // A at 3 is smallest
  })

  it('defaults minPayCount to reelCount when no payouts', () => {
    const config = { A: {} }
    const registry = createSymbolRegistry(['A'], 'W')
    const table = buildFlatPaytable(config, registry, 5)
    expect(table.minPayCount).toBe(5)
  })

  it('skips symbols not in registry', () => {
    const config = {
      A: { 3: 10 },
      UNKNOWN: { 3: 999 },
    }
    const registry = createSymbolRegistry(['A'], 'W')
    const table = buildFlatPaytable(config, registry, 5)
    const aId = registry.toId.get('A')!
    expect(table.payouts[aId]![3]).toBe(10)
  })
})

describe('findBestWildPayout', () => {
  it('finds highest payout for all-wild line', () => {
    const config = {
      A: { 3: 10, 5: 50 },
      B: { 3: 20, 5: 30 },
    }
    const registry = createSymbolRegistry(['A', 'B'], 'W')
    const table = buildFlatPaytable(config, registry, 5)
    const [payout, id] = findBestWildPayout(table, registry, 3)
    expect(payout).toBe(20) // B pays more at 3
    expect(id).toBe(registry.toId.get('B')!)
  })

  it('skips wild symbol in best-payout search', () => {
    const config = {
      W: { 3: 100 }, // wild itself has a payout entry but should be skipped
      A: { 3: 10 },
    }
    const registry = createSymbolRegistry(['W', 'A'], 'W')
    const table = buildFlatPaytable(config, registry, 5)
    const [payout] = findBestWildPayout(table, registry, 3)
    expect(payout).toBe(10) // A=10, W skipped
  })

  it('returns 0 when no symbol has payout for matchCount', () => {
    const config = { A: { 5: 50 } }
    const registry = createSymbolRegistry(['A'], 'W')
    const table = buildFlatPaytable(config, registry, 5)
    const [payout, id] = findBestWildPayout(table, registry, 3)
    expect(payout).toBe(0)
    expect(id).toBe(0)
  })
})
