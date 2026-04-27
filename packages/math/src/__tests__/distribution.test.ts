import { describe, expect, test } from 'bun:test'
import {
  bind,
  Distribution,
  distributionDo,
  Distributions,
  TrackedDistribution,
} from '../probability'
import { mt19937 } from '../rng'

// ─── Distribution ──────────────────────────────────────────────────────────

describe('Distribution.pure', () => {
  test('always returns the wrapped value', () => {
    const rng = mt19937(1)
    expect(Distribution.sample(Distribution.pure(7), rng)).toBe(7)
  })

  test('enumerate yields exactly one outcome with probability 1', () => {
    const outcomes = [...Distribution.enumerate(Distribution.pure('x'))]
    expect(outcomes).toHaveLength(1)
    expect(outcomes[0]!.value).toBe('x')
    expect(outcomes[0]!.probability).toBeCloseTo(1)
  })

  test('expectedValue of pure number is that number', () => {
    expect(Distribution.expectedValue(Distribution.pure(42))).toBe(42)
  })
})

describe('Distribution.weighted', () => {
  test('sample produces values from the distribution', () => {
    const d = Distribution.weighted([
      [1, 'a'],
      [3, 'b'],
    ] as const)
    const rng = mt19937(42)
    const seen = new Set<string>()
    for (let i = 0; i < 10_000; i++) seen.add(Distribution.sample(d, rng))
    expect(seen).toEqual(new Set(['a', 'b']))
  })

  test('enumerate yields correct probabilities', () => {
    const d = Distribution.weighted([
      [1, 'a'],
      [1, 'b'],
    ] as const)
    const outcomes = [...Distribution.enumerate(d)]
    expect(outcomes).toHaveLength(2)
    for (const o of outcomes) expect(o.probability).toBeCloseTo(0.5)
  })

  test('probability sum is 1', () => {
    const d = Distribution.weighted([
      [1, 10],
      [2, 20],
      [3, 30],
    ] as const)
    const sum = [...Distribution.enumerate(d)].reduce((acc, o) => acc + o.probability, 0)
    expect(sum).toBeCloseTo(1)
  })

  test('weighted 1:3 — heavier item has 0.75 probability', () => {
    const d = Distribution.weighted([
      [1, 'light'],
      [3, 'heavy'],
    ] as const)
    const outcomes = [...Distribution.enumerate(d)]
    const heavy = outcomes.find((o) => o.value === 'heavy')
    expect(heavy!.probability).toBeCloseTo(0.75)
  })

  test('statistical sampling matches probabilities', () => {
    const d = Distribution.weighted([
      [1, 0],
      [1, 1],
    ] as const)
    const rng = mt19937(99)
    let ones = 0
    const N = 100_000
    for (let i = 0; i < N; i++) if (Distribution.sample(d, rng) === 1) ones++
    expect(ones / N).toBeCloseTo(0.5, 1)
  })
})

describe('Distribution.uniform', () => {
  test('all items have equal probability', () => {
    const d = Distribution.uniform([1, 2, 3] as const)
    const outcomes = [...Distribution.enumerate(d)]
    expect(outcomes).toHaveLength(3)
    for (const o of outcomes) expect(o.probability).toBeCloseTo(1 / 3)
  })

  test('sample covers all items', () => {
    const d = Distribution.uniform(['a', 'b', 'c'] as const)
    const rng = mt19937(0)
    const seen = new Set<string>()
    for (let i = 0; i < 10_000; i++) seen.add(Distribution.sample(d, rng))
    expect(seen).toEqual(new Set(['a', 'b', 'c']))
  })
})

describe('Distribution.map', () => {
  test('transforms values', () => {
    const d = Distribution.map(Distribution.pure(5), (v) => v * 2)
    const rng = mt19937(1)
    expect(Distribution.sample(d, rng)).toBe(10)
  })

  test('enumerate reflects transformation', () => {
    const d = Distribution.map(
      Distribution.weighted([
        [1, 1],
        [1, 2],
      ] as const),
      (v) => v * 10,
    )
    const outcomes = [...Distribution.enumerate(d)].map((o) => o.value)
    expect(outcomes.sort()).toEqual([10, 20])
  })
})

describe('Distribution.flatMap', () => {
  test('chains distributions', () => {
    const d = Distribution.flatMap(Distribution.pure(3), (v) => Distribution.pure(v + 1))
    const rng = mt19937(1)
    expect(Distribution.sample(d, rng)).toBe(4)
  })

  test('outer distribution controls inner', () => {
    // coin flip: heads → die face from {1,2}, tails → die face from {3,4}
    const d = Distribution.flatMap(
      Distribution.weighted([
        [1, 'heads'],
        [1, 'tails'],
      ] as const),
      (side) => Distribution.uniform(side === 'heads' ? [1, 2] : ([3, 4] as const)),
    )
    const rng = mt19937(42)
    const values = new Set<number>()
    for (let i = 0; i < 10_000; i++) values.add(Distribution.sample(d, rng) as number)
    expect(values).toEqual(new Set([1, 2, 3, 4]))
  })

  test('expectedValue is correct after flatMap', () => {
    // E[2X] where X ~ Uniform{1,2,3} → E[X]=2, E[2X]=4
    const d = Distribution.flatMap(Distribution.uniform([1, 2, 3] as const), (v) =>
      Distribution.pure(v * 2),
    )
    expect(Distribution.expectedValue(d as Distribution<number>)).toBeCloseTo(4)
  })
})

describe('Distribution.enumerate', () => {
  test('respects maxDepth', () => {
    // Build a 2-level distribution
    const inner = Distribution.weighted([
      [1, 10],
      [1, 20],
    ] as const)
    const outer = Distribution.flatMap(
      Distribution.weighted([
        [1, 'a'],
        [1, 'b'],
      ] as const),
      () => inner,
    )
    // maxDepth=0 → no leaves yielded (all are branches)
    const shallow = [...Distribution.enumerate(outer, 0)]
    expect(shallow).toHaveLength(0)
    // maxDepth=50 → all leaves
    const deep = [...Distribution.enumerate(outer, 50)]
    expect(deep.length).toBeGreaterThan(0)
  })

  test('minProb filters low-probability outcomes', () => {
    // Build distribution with one very-low-probability outcome
    const d = Distribution.weighted([
      [1, 'rare'],
      [9999, 'common'],
    ] as const)
    const all = [...Distribution.enumerate(d)]
    const filtered = [...Distribution.enumerate(d, 50, 0.001)]
    expect(filtered.length).toBeLessThan(all.length)
  })
})

describe('Distribution.expectedValue', () => {
  test('fair coin: E = 0.5', () => {
    const d = Distribution.weighted([
      [1, 0],
      [1, 1],
    ] as const)
    expect(Distribution.expectedValue(d as Distribution<number>)).toBeCloseTo(0.5)
  })

  test('fair six-sided die: E = 3.5', () => {
    const d = Distributions.fairDie(6)
    expect(Distribution.expectedValue(d)).toBeCloseTo(3.5)
  })

  test('constant distribution: E = value', () => {
    expect(Distribution.expectedValue(Distribution.pure(100))).toBe(100)
  })
})

// ─── Distributions ─────────────────────────────────────────────────────────

describe('Distributions.bernoulli', () => {
  test('E[bernoulli(0.7)] = 0.7', () => {
    const d = Distributions.bernoulli(0.7)
    const numericDist = Distribution.map(d, (b: boolean) => (b ? 1 : 0))
    expect(Distribution.expectedValue(numericDist)).toBeCloseTo(0.7, 4)
  })

  test('bernoulli(0) is always false', () => {
    const d = Distributions.bernoulli(0)
    const outcomes = [...Distribution.enumerate(d)]
    const trueBranch = outcomes.find((o) => o.value === true)
    expect(trueBranch?.probability ?? 0).toBe(0)
  })

  test('statistical check: p=0.3 → ~30% true', () => {
    const d = Distributions.bernoulli(0.3)
    const rng = mt19937(42)
    let trues = 0
    const N = 100_000
    for (let i = 0; i < N; i++) if (Distribution.sample(d, rng)) trues++
    expect(trues / N).toBeCloseTo(0.3, 1)
  })
})

describe('Distributions.uniformInt', () => {
  test('samples in [lo, hi] inclusive', () => {
    const s = Distributions.uniformInt(3, 7)
    const rng = mt19937(0)
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) seen.add(s.sample(rng))
    expect(seen).toEqual(new Set([3, 4, 5, 6, 7]))
  })

  test('single value when lo === hi', () => {
    const s = Distributions.uniformInt(5, 5)
    const rng = mt19937(0)
    for (let i = 0; i < 20; i++) expect(s.sample(rng)).toBe(5)
  })
})

describe('Distributions.fairDie', () => {
  test('n=6 covers all faces', () => {
    const d = Distributions.fairDie(6)
    const rng = mt19937(0)
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) seen.add(Distribution.sample(d, rng))
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]))
  })

  test('all faces have equal probability', () => {
    const d = Distributions.fairDie(4)
    const outcomes = [...Distribution.enumerate(d)]
    for (const o of outcomes) expect(o.probability).toBeCloseTo(0.25)
  })
})

// ─── TrackedDistribution ────────────────────────────────────────────────────

describe('TrackedDistribution', () => {
  test('resolved — sample returns the resolved value', () => {
    const td = TrackedDistribution.resolved(42, 'path-a')
    const rng = mt19937(1)
    const result = TrackedDistribution.sample(td, rng)
    expect(result.value).toBe(42)
    expect(result.path).toBe('path-a')
  })

  test('fromWeightedValues — enumerate sums to 1', () => {
    const td = TrackedDistribution.fromWeightedValues(
      [
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
      ] as const,
      (v) => `path:${v}`,
    )
    const outcomes = [...TrackedDistribution.enumerate(td)]
    const total = outcomes.reduce((s, o) => s + o.probability, 0)
    expect(total).toBeCloseTo(1)
  })

  test('map applies f to value, path unchanged', () => {
    const td = TrackedDistribution.resolved(10, 'my-path')
    const mapped = TrackedDistribution.map(td, (v) => v * 5)
    const rng = mt19937(1)
    const result = TrackedDistribution.sample(mapped, rng)
    expect(result.value).toBe(50)
    expect(result.path).toBe('my-path')
  })

  test('flatMap on resolved applies f', () => {
    const td = TrackedDistribution.resolved(3, 'p')
    const fm = TrackedDistribution.flatMap(td, (v) => TrackedDistribution.resolved(v + 1, 'q'))
    const rng = mt19937(1)
    const result = TrackedDistribution.sample(fm, rng)
    expect(result.value).toBe(4)
  })
})

// ─── distributionDo (CE / do-notation) ──────────────────────────────────────

describe('distributionDo', () => {
  test('returns a pure value when no yields', () => {
    const d = distributionDo(function* () {
      return 42
    })
    expect(Distribution.expectedValue(d as Distribution<number>)).toBe(42)
  })

  test('single yield computes correct expected value', () => {
    const d = distributionDo(function* () {
      const n = yield* bind(Distribution.uniform([1, 2, 3] as const))
      return n * 2
    })
    // E[2 * Uniform{1,2,3}] = 2 * 2 = 4
    expect(Distribution.expectedValue(d as Distribution<number>)).toBeCloseTo(4)
  })

  test('two yields — joint distribution', () => {
    const d = distributionDo(function* () {
      const a = yield* bind(
        Distribution.weighted([
          [1, 2],
          [1, 3],
        ] as const),
      )
      const b = yield* bind(
        Distribution.weighted([
          [1, 0],
          [1, 1],
        ] as const),
      )
      return a + b
    })
    // E[a] = 2.5, E[b] = 0.5, E[a+b] = 3
    expect(Distribution.expectedValue(d as Distribution<number>)).toBeCloseTo(3)
  })

  test('enumerate produces the right outcomes', () => {
    const d = distributionDo(function* () {
      const flip = yield* bind(Distribution.uniform(['heads', 'tails'] as const))
      return flip === 'heads' ? 10 : 0
    })
    const outcomes = [...Distribution.enumerate(d as Distribution<number>)]
    expect(outcomes).toHaveLength(2)
    const head = outcomes.find((o) => o.value === 10)
    expect(head!.probability).toBeCloseTo(0.5)
  })
})
