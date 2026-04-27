import { describe, expect, test } from 'bun:test'
import { Sampler, SamplingPlan } from '../probability'
import { mt19937 } from '../rng'
import { Array1 } from '../functional/array1.js'

describe('Sampler.pure', () => {
  test('always returns the wrapped value', () => {
    const rng = mt19937(1)
    const s = Sampler.pure(99)
    for (let i = 0; i < 10; i++) expect(s.sample(rng)).toBe(99)
  })

  test('has a plan exposed', () => {
    expect(Sampler.pure(1).plan).toBeDefined()
  })
})

describe('Sampler.fromWeighted', () => {
  test('single item — always returns it', () => {
    const s = Sampler.fromWeighted([['only', 5]] as const)
    const rng = mt19937(42)
    for (let i = 0; i < 50; i++) expect(s.sample(rng)).toBe('only')
  })

  test('two equal-weight items — each ~50%', () => {
    const s = Sampler.fromWeighted([
      ['a', 1],
      ['b', 1],
    ] as const)
    const rng = mt19937(42)
    let aCount = 0
    const N = 100_000
    for (let i = 0; i < N; i++) if (s.sample(rng) === 'a') aCount++
    expect(aCount / N).toBeCloseTo(0.5, 1)
  })

  test('weighted 1:3 — heavier item ~75%', () => {
    const s = Sampler.fromWeighted([
      ['light', 1],
      ['heavy', 3],
    ] as const)
    const rng = mt19937(0)
    let heavyCount = 0
    const N = 100_000
    for (let i = 0; i < N; i++) if (s.sample(rng) === 'heavy') heavyCount++
    expect(heavyCount / N).toBeCloseTo(0.75, 1)
  })

  test('uses LinearSampler path for ≤32 items', () => {
    // 5 items → LinearSampler path; just verify it samples correctly
    const items = Array.from({ length: 5 }, (_, i) => [i, 1] as const)
    const s = Sampler.fromWeighted(Array1.unsafeFromArray(items))
    const rng = mt19937(1)
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) seen.add(s.sample(rng) as number)
    expect(seen.size).toBe(5)
  })

  test('uses AliasSampler path for >32 items', () => {
    const items = Array.from({ length: 50 }, (_, i) => [i, 1] as const)
    const s = Sampler.fromWeighted(Array1.unsafeFromArray(items))
    const rng = mt19937(2)
    const seen = new Set<number>()
    for (let i = 0; i < 50_000; i++) seen.add(s.sample(rng) as number)
    expect(seen.size).toBe(50)
  })
})

describe('Sampler.uniform', () => {
  test('all items equally probable', () => {
    const s = Sampler.uniform([1, 2, 3] as const)
    const rng = mt19937(42)
    const counts = new Map<number, number>()
    const N = 90_000
    for (let i = 0; i < N; i++) {
      const v = s.sample(rng) as number
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    for (const c of counts.values()) {
      expect(c / N).toBeCloseTo(1 / 3, 1)
    }
  })

  test('single item', () => {
    const s = Sampler.uniform(['x'] as const)
    const rng = mt19937(0)
    expect(s.sample(rng)).toBe('x')
  })
})

describe('Sampler.traverse', () => {
  test('returns array of mapped samples in order', () => {
    const rng = mt19937(0)
    const s = Sampler.traverse([0, 1, 2], (_, i) => Sampler.pure(i * 10))
    expect(s.sample(rng)).toEqual([0, 10, 20])
  })

  test('empty array returns []', () => {
    const rng = mt19937(0)
    const s = Sampler.traverse([], () => Sampler.pure(0))
    expect(s.sample(rng)).toEqual([])
  })

  test('each element can draw independently', () => {
    const rng = mt19937(42)
    const items = [0, 1, 2, 3, 4]
    const s = Sampler.traverse(items, (v) => Sampler.pure(v * 2))
    expect(s.sample(rng)).toEqual([0, 2, 4, 6, 8])
  })
})

describe('Sampler.sequence', () => {
  test('collects results in order', () => {
    const rng = mt19937(0)
    const s = Sampler.sequence([Sampler.pure(1), Sampler.pure(2), Sampler.pure(3)])
    expect(s.sample(rng)).toEqual([1, 2, 3])
  })

  test('empty sequence returns []', () => {
    const rng = mt19937(0)
    expect(Sampler.sequence([]).sample(rng)).toEqual([])
  })
})

describe('Sampler.map', () => {
  test('transforms the sampled value', () => {
    const rng = mt19937(42)
    const s = Sampler.pure(5).map((v) => v * 3)
    expect(s.sample(rng)).toBe(15)
  })

  test('uses direct sampler path when available', () => {
    const rng1 = mt19937(7)
    const rng2 = mt19937(7)
    const base = Sampler.fromWeighted([
      ['a', 1],
      ['b', 1],
    ] as const)
    const mapped = base.map((v) => v.toUpperCase())
    // Verify it still produces valid values
    const v = mapped.sample(rng1)
    expect(['A', 'B']).toContain(v)
    // Verify determinism
    expect(mapped.sample(rng2)).toBe(v)
  })

  test('plan is correct even when direct sampler unavailable', () => {
    // Sampler with no _sampler (constructed via plan only)
    const rng = mt19937(42)
    const s = new Sampler<number>(SamplingPlan.pure(10), null)
    const mapped = s.map((v: number) => v + 5)
    expect(mapped.sample(rng)).toBe(15)
  })
})

describe('Sampler.flatMap', () => {
  test('chains samplers', () => {
    const rng = mt19937(42)
    const s = Sampler.pure(3).flatMap((n) => Sampler.pure(n + 1))
    expect(s.sample(rng)).toBe(4)
  })

  test('inner sampler can produce random values', () => {
    const rng = mt19937(0)
    const s = Sampler.uniform([2, 3, 4] as const).flatMap((n) => Sampler.pure(n * 10))
    const v = s.sample(rng)
    expect([20, 30, 40]).toContain(v)
  })

  test('monad left identity: pure(a).flatMap(f) ≡ f(a)', () => {
    const rng1 = mt19937(5)
    const rng2 = mt19937(5)
    const f = (n: number) => Sampler.pure(n * 2)
    const left = Sampler.pure(7).flatMap(f)
    const right = f(7)
    for (let i = 0; i < 10; i++) {
      expect(left.sample(rng1)).toBe(right.sample(rng2))
    }
  })
})

describe('Sampler.sampleN', () => {
  test('returns n elements', () => {
    const rng = mt19937(0)
    const s = Sampler.pure(1)
    expect(s.sampleN(50, rng)).toHaveLength(50)
  })

  test('all values are in range', () => {
    const rng = mt19937(42)
    const s = Sampler.uniform([10, 20, 30] as const)
    const out = s.sampleN(1000, rng)
    for (const v of out) expect([10, 20, 30]).toContain(v)
  })

  test('n=0 returns empty array', () => {
    const rng = mt19937(0)
    expect(Sampler.pure('x').sampleN(0, rng)).toEqual([])
  })

  test('uses direct path and plan path equivalently', () => {
    const rng1 = mt19937(3)
    const rng2 = mt19937(3)
    const direct = Sampler.pure(99)
    const viaPlan = new Sampler<number>(SamplingPlan.pure(99), null)
    expect(direct.sampleN(5, rng1)).toEqual(viaPlan.sampleN(5, rng2))
  })
})
