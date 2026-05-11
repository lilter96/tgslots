import { describe, it, expect, beforeEach } from 'bun:test'
import { GameDispatcher, ApiError } from '../dispatcher'

// Minimal localStorage shim for Bun's test environment
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

function makeFetch(body: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }) as Response
}

describe('GameDispatcher', () => {
  beforeEach(() => storageMap.clear())

  it('builds the correct URL: /game/:gameId/:action', async () => {
    let capturedUrl = ''
    globalThis.fetch = async (url) => {
      capturedUrl = url as string
      return new Response(JSON.stringify({ sessionId: 'sess', state: {}, result: undefined }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const d = new GameDispatcher('woodland-whisper', 'http://api.test')
    await d.dispatch('spin', { multiplier: 1 })
    expect(capturedUrl).toBe('http://api.test/game/woodland-whisper/spin')
  })

  it('uses a relative base URL when baseUrl is empty', async () => {
    let capturedUrl = ''
    globalThis.fetch = async (url) => {
      capturedUrl = url as string
      return new Response(JSON.stringify({ sessionId: 'sess', state: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const d = new GameDispatcher('ancient-dragon', '')
    await d.dispatch('spin', { multiplier: 2 })
    expect(capturedUrl).toBe('/game/ancient-dragon/spin')
  })

  it('persists sessionId from response to localStorage', async () => {
    globalThis.fetch = makeFetch({ sessionId: 'sess-abc', state: {} })
    const d = new GameDispatcher('woodland-whisper', '')
    await d.dispatch('spin', { multiplier: 1 })
    expect(d.sessionId).toBe('sess-abc')
  })

  it('sends existing sessionId in request body', async () => {
    storageMap.set('tgslots:session:woodland-whisper', 'prior-sess')
    let capturedBody: Record<string, unknown> = {}
    globalThis.fetch = async (_url, opts) => {
      capturedBody = JSON.parse((opts as RequestInit).body as string)
      return new Response(JSON.stringify({ sessionId: 'prior-sess', state: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const d = new GameDispatcher('woodland-whisper', '')
    await d.dispatch('spin', { multiplier: 1 })
    expect(capturedBody['sessionId']).toBe('prior-sess')
  })

  it('does not include sessionId in body when none is stored', async () => {
    let capturedBody: Record<string, unknown> = {}
    globalThis.fetch = async (_url, opts) => {
      capturedBody = JSON.parse((opts as RequestInit).body as string)
      return new Response(JSON.stringify({ sessionId: 'new', state: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const d = new GameDispatcher('woodland-whisper', '')
    await d.dispatch('spin', { multiplier: 1 })
    expect('sessionId' in capturedBody).toBe(false)
  })

  it('uses separate localStorage keys per gameId', async () => {
    globalThis.fetch = makeFetch({ sessionId: 'ww-sess', state: {} })
    const ww = new GameDispatcher('woodland-whisper', '')
    const ad = new GameDispatcher('ancient-dragon', '')
    await ww.dispatch('spin', { multiplier: 1 })

    expect(ww.sessionId).toBe('ww-sess')
    expect(ad.sessionId).toBeNull()
  })

  it('throws ApiError on non-ok response (no stored session)', async () => {
    globalThis.fetch = makeFetch({ error: 'Game not found' }, 404)
    const d = new GameDispatcher('woodland-whisper', '')
    await expect(d.dispatch('spin', { multiplier: 1 })).rejects.toBeInstanceOf(ApiError)
  })

  it('auto-retries on 404 when a stale sessionId is stored, creating a fresh session', async () => {
    storageMap.set('tgslots:session:woodland-whisper', 'stale-sess')
    let callCount = 0
    globalThis.fetch = async (_url, opts) => {
      callCount++
      const body = JSON.parse((opts as RequestInit).body as string) as Record<string, unknown>
      if (callCount === 1) {
        expect(body['sessionId']).toBe('stale-sess')
        return new Response(JSON.stringify({ error: 'Session not found or expired' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      expect(body['sessionId']).toBeUndefined()
      return new Response(JSON.stringify({ sessionId: 'new-sess', state: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const d = new GameDispatcher('woodland-whisper', '')
    const result = await d.dispatch('spin', { multiplier: 1 })
    expect(callCount).toBe(2)
    expect(result.sessionId).toBe('new-sess')
    expect(d.sessionId).toBe('new-sess')
  })

  it('ApiError carries the HTTP status code', async () => {
    globalThis.fetch = makeFetch({ error: 'Server error' }, 500)
    const d = new GameDispatcher('woodland-whisper', '')
    try {
      await d.dispatch('spin', { multiplier: 1 })
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(500)
    }
  })

  it('clearSession removes the stored sessionId', () => {
    storageMap.set('tgslots:session:woodland-whisper', 'old-sess')
    const d = new GameDispatcher('woodland-whisper', '')
    expect(d.sessionId).toBe('old-sess')
    d.clearSession()
    expect(d.sessionId).toBeNull()
  })
})
