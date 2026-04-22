import { describe, expect, test } from 'bun:test'
import { CumulativeSampler } from '../samplers/cumulative-sampler.js'

describe('CumulativeSampler.build', () => {
  test('empty build produces zero weight and size', () => {
    const s = CumulativeSampler.build([])
    expect(s.totalWeight).toBe(0)
    expect(s.size).toBe(0)
  })

  test('sets correct totalWeight and size', () => {
    const s = CumulativeSampler.build([
      ['a', 10],
      ['b', 20],
      ['c', 30],
    ])
    expect(s.totalWeight).toBe(60)
    expect(s.size).toBe(3)
  })

  test('single item lookup', () => {
    const s = CumulativeSampler.build([['x', 100]])
    expect(s.lookup(0)).toBe('x')
    expect(s.lookup(99)).toBe('x')
  })
})

describe('CumulativeSampler.lookup', () => {
  const items = [
    ['a', 10],
    ['b', 20],
    ['c', 30],
  ] as const
  let s: CumulativeSampler<string>

  // @ts-ignore — bun:test doesn't require beforeEach import for this pattern
  s = CumulativeSampler.build(items)

  test('maps [0, 10) to first item', () => {
    // s is undefined due to static initialisation — rebuild inline
    const cs = CumulativeSampler.build(items)
    expect(cs.lookup(0)).toBe('a')
    expect(cs.lookup(9)).toBe('a')
  })

  test('maps [10, 30) to second item', () => {
    const cs = CumulativeSampler.build(items)
    expect(cs.lookup(10)).toBe('b')
    expect(cs.lookup(29)).toBe('b')
  })

  test('maps [30, 60) to third item', () => {
    const cs = CumulativeSampler.build(items)
    expect(cs.lookup(30)).toBe('c')
    expect(cs.lookup(59)).toBe('c')
  })

  test('throws for target >= totalWeight', () => {
    const cs = CumulativeSampler.build(items)
    expect(() => cs.lookup(60)).toThrow('CumulativeSampler: target out of range')
    expect(() => cs.lookup(100)).toThrow('CumulativeSampler: target out of range')
  })

  test('lookup is exhaustive across all weights', () => {
    const cs = CumulativeSampler.build([
      ['a', 5],
      ['b', 5],
      ['c', 5],
    ])
    const results = Array.from({ length: 15 }, (_, i) => cs.lookup(i))
    expect(results.filter((v) => v === 'a').length).toBe(5)
    expect(results.filter((v) => v === 'b').length).toBe(5)
    expect(results.filter((v) => v === 'c').length).toBe(5)
  })

  test('larger build (10 items) correct boundaries', () => {
    const items10 = Array.from({ length: 10 }, (_, i) => [i, 10] as const)
    const cs = CumulativeSampler.build(items10)
    for (let i = 0; i < 10; i++) {
      expect(cs.lookup(i * 10)).toBe(i)
      expect(cs.lookup(i * 10 + 9)).toBe(i)
    }
  })
})

describe('CumulativeSampler.insert', () => {
  test('increments totalWeight and size', () => {
    const cs = CumulativeSampler.build([['a', 10]])
    cs.insert('b', 20)
    expect(cs.totalWeight).toBe(30)
    expect(cs.size).toBe(2)
  })

  test('inserted item is reachable via lookup', () => {
    const cs = CumulativeSampler.build([['a', 10]])
    cs.insert('b', 20)
    // 'b' was inserted with weight 20; it occupies [10, 30) (right subtree)
    expect(cs.lookup(10)).toBe('b')
    expect(cs.lookup(29)).toBe('b')
  })

  test('multiple insertions remain searchable', () => {
    const cs = CumulativeSampler.build<string>([])
    cs.insert('x', 1)
    cs.insert('y', 1)
    cs.insert('z', 1)
    expect(cs.size).toBe(3)
    expect(cs.totalWeight).toBe(3)
    // At least two distinct values are reachable
    const seen = new Set([cs.lookup(0), cs.lookup(1), cs.lookup(2)])
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })
})

describe('CumulativeSampler.toArray', () => {
  test('returns items in sorted order (in-order traversal)', () => {
    const cs = CumulativeSampler.build([
      ['a', 5],
      ['b', 10],
      ['c', 15],
    ])
    const arr = cs.toArray()
    expect(arr).toHaveLength(3)
    expect(arr.map(([v]) => v)).toEqual(['a', 'b', 'c'])
  })

  test('empty sampler returns empty array', () => {
    const cs = CumulativeSampler.build([])
    expect(cs.toArray()).toEqual([])
  })
})
