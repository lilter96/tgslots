import { describe, expect, test } from 'bun:test'
import { SamplingPlan } from '../probability'
import { mt19937 } from '../rng'

describe('SamplingPlan.pure', () => {
  test('returns the wrapped value', () => {
    const rng = mt19937(1)
    expect(SamplingPlan.interpret(SamplingPlan.pure(42), rng)).toBe(42)
  })

  test('works with non-primitive values', () => {
    const rng = mt19937(1)
    const obj = { x: 1 }
    expect(SamplingPlan.interpret(SamplingPlan.pure(obj), rng)).toBe(obj)
  })
})

describe('SamplingPlan.draw', () => {
  test('produces values in [lo, hi)', () => {
    const rng = mt19937(42)
    const plan = SamplingPlan.draw(5, 15)
    for (let i = 0; i < 100; i++) {
      const v = SamplingPlan.interpret(plan, rng)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(15)
    }
  })

  test('covers the full range', () => {
    const rng = mt19937(0)
    const plan = SamplingPlan.draw(0, 4)
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) seen.add(SamplingPlan.interpret(plan, rng))
    expect(seen).toEqual(new Set([0, 1, 2, 3]))
  })
})

describe('SamplingPlan.drawWith', () => {
  test('applies continuation to the drawn value', () => {
    const rng = mt19937(0)
    // draw(0,5) then return draw + 100 as pure
    const plan = SamplingPlan.drawWith(0, 5, (n) => SamplingPlan.pure(n + 100))
    const v = SamplingPlan.interpret(plan, rng)
    expect(v).toBeGreaterThanOrEqual(100)
    expect(v).toBeLessThan(105)
  })

  test('continuation can itself draw', () => {
    const rng = mt19937(42)
    const plan = SamplingPlan.drawWith(1, 4, (n) => SamplingPlan.draw(0, n))
    const v = SamplingPlan.interpret(plan, rng)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(4) // outer range is [1,4), so inner is at most [0,3)
  })
})

describe('SamplingPlan.map', () => {
  test('transforms the output', () => {
    const rng = mt19937(42)
    const plan = SamplingPlan.map(SamplingPlan.pure(7), (v) => v * 3)
    expect(SamplingPlan.interpret(plan, rng)).toBe(21)
  })

  test('map over draw applies f to every sample', () => {
    const rng = mt19937(42)
    const plan = SamplingPlan.map(SamplingPlan.draw(0, 100), (v) => v * 2)
    for (let i = 0; i < 50; i++) {
      expect(SamplingPlan.interpret(plan, rng) % 2).toBe(0)
    }
  })

  test('identity map does not change the value', () => {
    const rng1 = mt19937(5)
    const rng2 = mt19937(5)
    const plan = SamplingPlan.draw(0, 1000)
    const mapped = SamplingPlan.map(plan, (v) => v)
    for (let i = 0; i < 20; i++) {
      expect(SamplingPlan.interpret(mapped, rng1)).toBe(SamplingPlan.interpret(plan, rng2))
    }
  })
})

describe('SamplingPlan.flatMap', () => {
  test('chains two plans', () => {
    const rng = mt19937(0)
    // Always draw 3 then return pure(3 * 10)
    const plan = SamplingPlan.flatMap(SamplingPlan.pure(3), (n) => SamplingPlan.pure(n * 10))
    expect(SamplingPlan.interpret(plan, rng)).toBe(30)
  })

  test('inner plan uses drawn value from outer', () => {
    const rng = mt19937(42)
    // draw 1-3, then draw 0..n
    const plan = SamplingPlan.flatMap(SamplingPlan.draw(1, 4), (n) => SamplingPlan.draw(0, n))
    const v = SamplingPlan.interpret(plan, rng)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(4)
  })

  test('left identity monad law: pure(a).flatMap(f) ≡ f(a)', () => {
    const rng1 = mt19937(99)
    const rng2 = mt19937(99)
    const f = (n: number) => SamplingPlan.draw(0, n + 1)
    const left = SamplingPlan.flatMap(SamplingPlan.pure(5), f)
    const right = f(5)
    for (let i = 0; i < 20; i++) {
      expect(SamplingPlan.interpret(left, rng1)).toBe(SamplingPlan.interpret(right, rng2))
    }
  })
})

describe('SamplingPlan.interpret', () => {
  test('is stack-safe for deeply nested flatMaps (10 000 levels)', () => {
    let plan: SamplingPlan<number> = SamplingPlan.pure(0)
    for (let i = 0; i < 10_000; i++) {
      plan = SamplingPlan.flatMap(plan, (v) => SamplingPlan.pure(v + 1))
    }
    const rng = mt19937(1)
    expect(SamplingPlan.interpret(plan, rng)).toBe(10_000)
  })

  test('is deterministic — same plan + same seed → same result', () => {
    const plan = SamplingPlan.flatMap(SamplingPlan.draw(0, 100), (n) =>
      SamplingPlan.map(SamplingPlan.draw(0, 100), (m) => n + m),
    )
    const a = SamplingPlan.interpret(plan, mt19937(7))
    const b = SamplingPlan.interpret(plan, mt19937(7))
    expect(a).toBe(b)
  })
})

describe('SamplingPlan.sampleN', () => {
  test('produces n samples', () => {
    const rng = mt19937(0)
    const plan = SamplingPlan.draw(0, 10)
    const out = SamplingPlan.sampleN(plan, 50, rng)
    expect(out).toHaveLength(50)
  })

  test('all samples are in range', () => {
    const rng = mt19937(0)
    const plan = SamplingPlan.draw(3, 8)
    const out = SamplingPlan.sampleN(plan, 200, rng)
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThan(8)
    }
  })

  test('n=0 returns empty array', () => {
    const rng = mt19937(0)
    expect(SamplingPlan.sampleN(SamplingPlan.pure(1), 0, rng)).toEqual([])
  })
})
