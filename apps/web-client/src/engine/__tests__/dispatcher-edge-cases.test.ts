import { describe, expect, it } from 'bun:test'
import { GameDispatcher, ApiError } from '../dispatcher.js'

// localStorage shim for Bun's test environment
const storageMap = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
  },
  writable: true,
  configurable: true,
})

describe('GameDispatcher localStorage guard', () => {
  it('returns null when localStorage.getItem throws', () => {
    const originalGetItem = localStorage.getItem
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    ;(localStorage as Record<string, unknown>).getItem = () => {
      throw new Error('SecurityError: access denied')
    }

    const d = new GameDispatcher('le-militare', '')
    try {
      expect(d.sessionId).toBeNull()
    } finally {
      localStorage.getItem = originalGetItem
    }
  })

  it('clearSession does not throw when localStorage.removeItem throws', () => {
    const originalRemoveItem = localStorage.removeItem
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    ;(localStorage as Record<string, unknown>).removeItem = () => {
      throw new Error('SecurityError: access denied')
    }

    const d = new GameDispatcher('le-militare', '')
    try {
      expect(() => d.clearSession()).not.toThrow()
    } finally {
      localStorage.removeItem = originalRemoveItem
    }
  })
})

describe('ApiError', () => {
  it('has status and message properties', () => {
    const err = new ApiError(500, 'Server error')
    expect(err.status).toBe(500)
    expect(err.message).toBe('Server error')
    expect(err.name).toBe('ApiError')
  })
})
