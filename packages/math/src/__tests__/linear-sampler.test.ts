import { describe, expect, test } from 'bun:test'
import { LinearSampler } from '../samplers/linear-sampler.js'

describe('LinearSampler', () => {
  test('computes totalWeight correctly', () => {
    const s = new LinearSampler([
      ['a', 3],
      ['b', 7],
    ])
    expect(s.totalWeight).toBe(10)
  })

  test('size reflects item count', () => {
    const s = new LinearSampler([
      ['x', 1],
      ['y', 2],
      ['z', 3],
    ])
    expect(s.size).toBe(3)
  })

  test('lookup(0) returns first item', () => {
    const s = new LinearSampler([
      ['first', 10],
      ['second', 10],
    ])
    expect(s.lookup(0)).toBe('first')
    expect(s.lookup(9)).toBe('first')
  })

  test('lookup at boundary returns correct item', () => {
    const s = new LinearSampler([
      ['a', 10],
      ['b', 20],
      ['c', 30],
    ])
    expect(s.lookup(9)).toBe('a')
    expect(s.lookup(10)).toBe('b')
    expect(s.lookup(29)).toBe('b')
    expect(s.lookup(30)).toBe('c')
  })

  test('lookup beyond totalWeight falls back to last item', () => {
    const s = new LinearSampler([
      ['a', 5],
      ['b', 5],
    ])
    // target >= totalWeight (10) — fallback to last
    expect(s.lookup(999)).toBe('b')
  })

  test('single item always returned', () => {
    const s = new LinearSampler([['only', 100]])
    expect(s.lookup(0)).toBe('only')
    expect(s.lookup(99)).toBe('only')
    expect(s.lookup(500)).toBe('only')
  })

  test('lookup is exhaustive — covers each item proportionally', () => {
    const s = new LinearSampler([
      ['a', 3],
      ['b', 3],
      ['c', 4],
    ])
    const results = Array.from({ length: 10 }, (_, i) => s.lookup(i))
    expect(results.filter((v) => v === 'a').length).toBe(3)
    expect(results.filter((v) => v === 'b').length).toBe(3)
    expect(results.filter((v) => v === 'c').length).toBe(4)
  })

  test('works with integer values', () => {
    const s = new LinearSampler([
      [10, 1],
      [20, 1],
      [30, 1],
    ])
    expect(s.lookup(0)).toBe(10)
    expect(s.lookup(1)).toBe(20)
    expect(s.lookup(2)).toBe(30)
  })

  test('items are accessible via property', () => {
    const items = [
      ['a', 1],
      ['b', 2],
    ] as const
    const s = new LinearSampler(items)
    expect(s.items).toBe(items)
  })
})
