import { describe, expect, test } from 'bun:test'
import { Either } from '../functional/either.js'

describe('Either.left / Either.right construction', () => {
  test('left has tag 0', () => {
    const e = Either.left(42)
    expect(e.tag).toBe(0)
    expect(e.value).toBe(42)
  })

  test('right has tag 1', () => {
    const e = Either.right('hello')
    expect(e.tag).toBe(1)
    expect(e.value).toBe('hello')
  })
})

describe('Either.isLeft / Either.isRight', () => {
  test('isLeft returns true for Left', () => {
    expect(Either.isLeft(Either.left(1))).toBe(true)
  })

  test('isLeft returns false for Right', () => {
    expect(Either.isLeft(Either.right(1))).toBe(false)
  })

  test('isRight returns true for Right', () => {
    expect(Either.isRight(Either.right('x'))).toBe(true)
  })

  test('isRight returns false for Left', () => {
    expect(Either.isRight(Either.left('x'))).toBe(false)
  })
})

describe('Either.match', () => {
  test('calls onLeft for Left', () => {
    const result = Either.match(
      Either.left(5),
      (l) => `left:${l}`,
      (_) => 'right',
    )
    expect(result).toBe('left:5')
  })

  test('calls onRight for Right', () => {
    const result = Either.match(
      Either.right(10),
      (_) => 'left',
      (r) => `right:${r}`,
    )
    expect(result).toBe('right:10')
  })

  test('branches are exclusive', () => {
    let leftCalled = false
    let rightCalled = false
    Either.match(
      Either.left(1),
      () => {
        leftCalled = true
      },
      () => {
        rightCalled = true
      },
    )
    expect(leftCalled).toBe(true)
    expect(rightCalled).toBe(false)
  })
})

describe('Either.mapLeft', () => {
  test('transforms Left value', () => {
    const e = Either.mapLeft(Either.left(3), (v) => v * 2)
    expect(Either.isLeft(e)).toBe(true)
    if (Either.isLeft(e)) expect(e.value).toBe(6)
  })

  test('passes Right through unchanged', () => {
    const original = Either.right('unchanged')
    const result = Either.mapLeft(original, (_) => 'should-not-run')
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) expect(result.value).toBe('unchanged')
  })
})

describe('Either.mapRight', () => {
  test('transforms Right value', () => {
    const e = Either.mapRight(Either.right(10), (v) => v + 5)
    expect(Either.isRight(e)).toBe(true)
    if (Either.isRight(e)) expect(e.value).toBe(15)
  })

  test('passes Left through unchanged', () => {
    const original = Either.left('error')
    const result = Either.mapRight(original, (_) => 'ignored')
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) expect(result.value).toBe('error')
  })
})

describe('Either — round-trip and composition', () => {
  test('mapLeft then mapLeft composes correctly', () => {
    const e = Either.mapLeft(
      Either.mapLeft(Either.left(1), (v) => v + 1),
      (v) => v * 3,
    )
    if (Either.isLeft(e)) expect(e.value).toBe(6)
  })

  test('mapRight then mapRight composes correctly', () => {
    const e = Either.mapRight(
      Either.mapRight(Either.right(2), (v) => v * 5),
      (v) => v - 1,
    )
    if (Either.isRight(e)) expect(e.value).toBe(9)
  })

  test('works with object values', () => {
    const obj = { code: 404, msg: 'not found' }
    const e = Either.left(obj)
    if (Either.isLeft(e)) {
      expect(e.value.code).toBe(404)
      expect(e.value.msg).toBe('not found')
    }
  })
})
