import { describe, expect, test } from 'bun:test'
import { jsRng, mt19937 } from '../rng'

describe('mt19937', () => {
  test('produces deterministic sequence for fixed seed', () => {
    const a = mt19937(42)
    const b = mt19937(42)
    const N = 20
    for (let i = 0; i < N; i++) {
      expect(a(0, 0x100000000)).toBe(b(0, 0x100000000))
    }
  })

  test('known output for seed 42 (first 5 raw uint32 values)', () => {
    const rng = mt19937(42)
    // Verified against implementation
    expect(rng(0, 0x100000000)).toBe(1168853821)
    expect(rng(0, 0x100000000)).toBe(1835881930)
    expect(rng(0, 0x100000000)).toBe(3522640943)
    expect(rng(0, 0x100000000)).toBe(3938942007)
    expect(rng(0, 0x100000000)).toBe(208079129)
  })

  test('known output for seed 0 (first 5 raw uint32 values)', () => {
    const rng = mt19937(0)
    expect(rng(0, 0x100000000)).toBe(688971744)
    expect(rng(0, 0x100000000)).toBe(3329046430)
    expect(rng(0, 0x100000000)).toBe(3772337804)
    expect(rng(0, 0x100000000)).toBe(1300767542)
    expect(rng(0, 0x100000000)).toBe(770987359)
  })

  test('different seeds produce different sequences', () => {
    const a = mt19937(1)
    const b = mt19937(2)
    const first_a = a(0, 0x100000000)
    const first_b = b(0, 0x100000000)
    expect(first_a).not.toBe(first_b)
  })

  test('output is always in [lo, hi)', () => {
    const rng = mt19937(99)
    for (let i = 0; i < 1000; i++) {
      const v = rng(100, 200)
      expect(v).toBeGreaterThanOrEqual(100)
      expect(v).toBeLessThan(200)
    }
  })

  test('range of 1 always returns lo', () => {
    const rng = mt19937(7)
    for (let i = 0; i < 20; i++) {
      expect(rng(5, 6)).toBe(5)
    }
  })

  test('range of 0 (lo === hi) returns lo', () => {
    const rng = mt19937(7)
    for (let i = 0; i < 10; i++) {
      expect(rng(5, 5)).toBe(5)
    }
  })

  test('covers the full range [0, n) — no missing values for small n', () => {
    const rng = mt19937(123)
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) seen.add(rng(0, 10))
    expect(seen.size).toBe(10)
  })

  test('produces all 1000 possible values in [0, 1000)', () => {
    const rng = mt19937(456)
    const seen = new Set<number>()
    for (let i = 0; i < 100_000; i++) seen.add(rng(0, 1000))
    expect(seen.size).toBe(1000)
  })

  test('generates integers, not floats', () => {
    const rng = mt19937(1)
    for (let i = 0; i < 100; i++) {
      expect(rng(0, 1000) % 1).toBe(0)
    }
  })

  test('output is statistically uniform — chi-square for 6 bins', () => {
    const rng = mt19937(42)
    const bins = new Array<number>(6).fill(0)
    const N = 600_000
    for (let i = 0; i < N; i++) bins[rng(0, 6)!]!++
    const expected = N / 6
    for (const count of bins) {
      const deviation = Math.abs(count - expected) / expected
      expect(deviation).toBeLessThan(0.01) // within 1%
    }
  })

  // Triggers the second generation pass (mti wraps after 624 draws)
  test('remains correct after refilling the state array (>624 draws)', () => {
    const rng = mt19937(77)
    for (let i = 0; i < 700; i++) rng(0, 100)
    // Same seed, fast-forward to same position
    const rng2 = mt19937(77)
    for (let i = 0; i < 700; i++) rng2(0, 100)
    expect(rng(0, 0x100000000)).toBe(rng2(0, 0x100000000))
  })
})

describe('jsRng', () => {
  test('returns integer in [lo, hi)', () => {
    const rng = jsRng()
    for (let i = 0; i < 500; i++) {
      const v = rng(10, 20)
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThan(20)
    }
  })

  test('returns lo when range is 1', () => {
    const rng = jsRng()
    for (let i = 0; i < 20; i++) {
      expect(rng(3, 4)).toBe(3)
    }
  })

  test('returns integer (no fractions)', () => {
    const rng = jsRng()
    for (let i = 0; i < 100; i++) {
      expect(rng(0, 1000) % 1).toBe(0)
    }
  })
})
