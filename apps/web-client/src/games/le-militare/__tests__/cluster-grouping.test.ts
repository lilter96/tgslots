import { describe, expect, it } from 'bun:test'
import { groupHitsBySymbol } from '../helpers/cluster-grouping.js'
import type { ClusterHit } from '@tgslots/slots-core'

function hit(symbolId: number, positions: number[]): ClusterHit {
  return {
    symbolId,
    symbolName: `S${symbolId}`,
    size: positions.length,
    basePayout: 0,
    totalPayout: 0,
    positions,
  }
}

describe('groupHitsBySymbol', () => {
  it('returns empty map for empty input', () => {
    expect(groupHitsBySymbol([])).toEqual(new Map())
  })

  it('groups a single hit under its symbol', () => {
    const h = hit(3, [0, 1, 2])
    const result = groupHitsBySymbol([h])
    expect(result.size).toBe(1)
    expect(result.get(3)).toEqual([h])
  })

  it('groups multiple hits by symbol id', () => {
    const h1 = hit(1, [0])
    const h2 = hit(2, [5])
    const h3 = hit(1, [10])
    const result = groupHitsBySymbol([h1, h2, h3])
    expect(result.size).toBe(2)
    expect(result.get(1)).toEqual([h1, h3])
    expect(result.get(2)).toEqual([h2])
  })

  it('preserves original order within each group', () => {
    const hits = [hit(5, [0]), hit(5, [1]), hit(5, [2])]
    const result = groupHitsBySymbol(hits)
    expect(result.get(5)).toEqual(hits)
  })
})
