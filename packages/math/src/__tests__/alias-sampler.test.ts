import { describe, expect, test } from 'bun:test'
import { AliasSampler } from '../samplers/alias-sampler.js'
import { mt19937 } from '../rng'

describe('AliasSampler.build', () => {
  test('sets correct size and totalWeight', () => {
    const s = AliasSampler.build([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ] as const)
    expect(s.size).toBe(3)
    expect(s.totalWeight).toBe(6)
  })

  test('single item — always returns that item', () => {
    const s = AliasSampler.build([['only', 10]] as const)
    const rng = mt19937(42)
    for (let i = 0; i < 100; i++) expect(s.sample(rng)).toBe('only')
  })

  test('two items with equal weight — each ~50%', () => {
    const s = AliasSampler.build([
      ['a', 1],
      ['b', 1],
    ] as const)
    const rng = mt19937(42)
    let aCount = 0
    const N = 200_000
    for (let i = 0; i < N; i++) if (s.sample(rng) === 'a') aCount++
    expect(aCount / N).toBeCloseTo(0.5, 1) // within 0.05
  })

  test('three items weighted 1:2:3 — frequencies match proportions', () => {
    const items = [
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ] as const
    const s = AliasSampler.build(items)
    const rng = mt19937(0)
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 }
    const N = 300_000
    for (let i = 0; i < N; i++) counts[s.sample(rng) as string]!++
    expect(counts.a! / N).toBeCloseTo(1 / 6, 1)
    expect(counts.b! / N).toBeCloseTo(2 / 6, 1)
    expect(counts.c! / N).toBeCloseTo(3 / 6, 1)
  })

  test('zero-weight items are never sampled', () => {
    const s = AliasSampler.build([
      ['never', 0],
      ['always', 1],
    ] as const)
    const rng = mt19937(7)
    for (let i = 0; i < 1000; i++) expect(s.sample(rng)).toBe('always')
  })

  test('integer items', () => {
    const items = Array.from({ length: 10 }, (_, i) => [i, 1] as const)
    const s = AliasSampler.build(items)
    const rng = mt19937(99)
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) seen.add(s.sample(rng) as number)
    expect(seen.size).toBe(10)
  })

  test('large uniform distribution (100 items) — all values seen', () => {
    const items = Array.from({ length: 100 }, (_, i) => [i, 1] as const)
    const s = AliasSampler.build(items)
    const rng = mt19937(1)
    const seen = new Set<number>()
    for (let i = 0; i < 50_000; i++) seen.add(s.sample(rng) as number)
    expect(seen.size).toBe(100)
  })
})

describe('AliasSampler.build — error handling', () => {
  test('throws on empty collection', () => {
    expect(() => AliasSampler.build([])).toThrow('AliasSampler: empty collection')
  })

  test('throws on negative weight', () => {
    expect(() => AliasSampler.build([['x', -1]] as const)).toThrow(
      'AliasSampler: item 0 has invalid weight -1',
    )
  })

  test('throws on NaN weight', () => {
    expect(() => AliasSampler.build([['x', NaN]] as const)).toThrow('invalid weight')
  })

  test('throws when all weights are zero', () => {
    expect(() =>
      AliasSampler.build([
        ['x', 0],
        ['y', 0],
      ] as const),
    ).toThrow('AliasSampler: totalWeight must be > 0')
  })

  test('throws when n exceeds 4096', () => {
    const items = Array.from({ length: 4097 }, (_, i) => [i, 1] as const)
    expect(() => AliasSampler.build(items)).toThrow('exceeds max 4096')
  })
})

describe('AliasSampler.getSamplerData', () => {
  test('sampleFn produces same distribution as sample()', () => {
    const items = [
      ['a', 1],
      ['b', 3],
    ] as const
    const s = AliasSampler.build(items)
    const { range, sampleFn } = s.getSamplerData()

    // Verify range equals size * P (2^20)
    expect(range).toBe(2 * (1 << 20))

    const rng = mt19937(55)
    let bCount = 0
    const N = 200_000
    for (let i = 0; i < N; i++) {
      if (sampleFn(rng(0, range)) === 'b') bCount++
    }
    expect(bCount / N).toBeCloseTo(0.75, 1)
  })
})
