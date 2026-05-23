import { describe, expect, it } from 'bun:test'
import { buildPaylineTrie } from '../paylines/payline-trie.js'

describe('buildPaylineTrie', () => {
  it('builds a trie from payline definitions', () => {
    const paylines = [
      { rows: [0, 0, 0, 0, 0] },
      { rows: [1, 1, 1, 1, 1] },
      { rows: [0, 0, 0, 0, 1] }, // shares prefix with first
    ]
    const trie = buildPaylineTrie(paylines, 5, 3)
    expect(trie.root).toBeDefined()
    expect(trie.paylineOrder.length).toBe(3)
    // All payline indices should be in the order
    expect(new Set(trie.paylineOrder)).toEqual(new Set([0, 1, 2]))
  })

  it('handles empty paylines', () => {
    const trie = buildPaylineTrie([], 5, 3)
    expect(trie.paylineOrder).toHaveLength(0)
    expect(trie.root.plStart).toBe(0)
    expect(trie.root.plEnd).toBe(0)
  })

  it('nodes with shared prefix share trie path', () => {
    const paylines = [{ rows: [0, 0, 0, 0, 0] }, { rows: [0, 0, 0, 0, 1] }]
    const trie = buildPaylineTrie(paylines, 5, 3)
    // Root should have one child at row 0
    const rootChild = trie.root.children[0]
    expect(rootChild).not.toBeNull()
    // Both paylines are under this subtree
    expect(rootChild!.plStart).toBe(0)
    expect(rootChild!.plEnd).toBe(2)
  })

  it('assigns contiguous payline ranges for subtrees', () => {
    const paylines = [
      { rows: [0, 1, 2, 0, 0] },
      { rows: [1, 0, 0, 0, 0] },
      { rows: [2, 2, 2, 2, 2] },
    ]
    const trie = buildPaylineTrie(paylines, 5, 3)

    // Root covers all 3 paylines
    expect(trie.root.plStart).toBe(0)
    expect(trie.root.plEnd).toBe(3)

    // Each reel-0 row child covers a disjoint contiguous range
    let seen = 0
    for (let row = 0; row < 3; row++) {
      const child = trie.root.children[row]
      if (child) {
        expect(child.plStart).toBe(seen)
        expect(child.plEnd).toBeGreaterThan(seen)
        seen = child.plEnd
      }
    }
  })

  it('skips paylines with missing rows', () => {
    const paylines = [
      { rows: [0] }, // only 1 reel defined, 5 reels expected
      { rows: [0, 0, 0, 0, 0] },
    ]
    const trie = buildPaylineTrie(paylines, 5, 3)
    // First payline with only 1 reel row should be handled safely
    expect(trie.paylineOrder.length).toBeGreaterThanOrEqual(1)
  })
})
