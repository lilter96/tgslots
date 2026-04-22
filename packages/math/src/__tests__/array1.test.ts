import { describe, test, expect } from 'bun:test'
import { Array1 } from '../functional/array1.js'

describe('Array1.of', () => {
  test('creates a non-empty array from head only', () => {
    const a = Array1.of(1)
    expect(a).toEqual([1])
  })

  test('creates a non-empty array from head + tail', () => {
    const a = Array1.of(1, 2, 3)
    expect(a).toEqual([1, 2, 3])
  })

  test('head element is preserved', () => {
    const a = Array1.of('first', 'second')
    expect(a[0]).toBe('first')
  })
})

describe('Array1.fromArray', () => {
  test('returns null for empty array', () => {
    expect(Array1.fromArray([])).toBeNull()
  })

  test('returns Array1 for non-empty array', () => {
    const result = Array1.fromArray([1, 2, 3])
    expect(result).not.toBeNull()
    expect(result).toEqual([1, 2, 3])
  })

  test('single-element array is valid', () => {
    const result = Array1.fromArray([42])
    expect(result).not.toBeNull()
    expect(result![0]).toBe(42)
  })
})

describe('Array1.unsafeFromArray', () => {
  test('returns Array1 for non-empty array', () => {
    const a = Array1.unsafeFromArray([10, 20, 30])
    expect(a).toEqual([10, 20, 30])
  })

  test('throws on empty array', () => {
    expect(() => Array1.unsafeFromArray([])).toThrow('Array1: empty array')
  })
})

describe('Array1.head', () => {
  test('returns first element', () => {
    expect(Array1.head([5, 6, 7])).toBe(5)
  })

  test('works for single-element array', () => {
    expect(Array1.head([42])).toBe(42)
  })
})

describe('Array1.map', () => {
  test('maps values', () => {
    const a = Array1.of(1, 2, 3)
    const result = Array1.map(a, (v) => v * 2)
    expect(result).toEqual([2, 4, 6])
  })

  test('passes index to mapper', () => {
    const a = Array1.of('a', 'b', 'c')
    const result = Array1.map(a, (v, i) => `${i}:${v}`)
    expect(result).toEqual(['0:a', '1:b', '2:c'])
  })

  test('preserves Array1 type (result is non-empty)', () => {
    const a = Array1.of(1)
    const result = Array1.map(a, (v) => v + 10)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(11)
  })

  test('identity map returns same values', () => {
    const a = Array1.of(1, 2, 3)
    expect(Array1.map(a, (v) => v)).toEqual([1, 2, 3])
  })
})
