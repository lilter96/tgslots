import { describe, expect, it } from 'bun:test'
import { InMemorySessionManager } from '../in-memory-session-manager.js'

interface SessionEntry {
  gameId: string
  state: Record<string, object>
  lastAccessedAt: number
}

function getStore(mgr: InMemorySessionManager): Map<string, SessionEntry> {
  return (mgr as object as { store: Map<string, SessionEntry> }).store
}

function expire(store: Map<string, SessionEntry>, id: string): void {
  const raw = store.get(id)
  if (raw) raw.lastAccessedAt = 0
}

describe('InMemorySessionManager', () => {
  it('load() removes the specific expired session being loaded', () => {
    const mgr = new InMemorySessionManager()
    const store = getStore(mgr)
    const id = mgr.create('le-militare', { lastGrid: null, freeSpins: null, roundWin: 0 })
    expire(store, id)

    const loaded = mgr.load(id)
    expect(loaded).toBeNull()
    expect(store.has(id)).toBe(false)
  })

  it('load() does not iterate the entire store (O(1) per load)', () => {
    const mgr = new InMemorySessionManager()
    const store = getStore(mgr)

    // Create two sessions
    const active = mgr.create('le-militare', { lastGrid: null, freeSpins: null, roundWin: 0 })
    const abandoned = mgr.create('le-militare', { lastGrid: null, freeSpins: null, roundWin: 0 })

    // Expire only the abandoned one
    expire(store, abandoned)

    // Load the active session — should NOT purge abandoned sessions.
    // create() is responsible for bulk cleanup; load() only handles its
    // own entry to stay O(1).
    const loaded = mgr.load(active)
    expect(loaded).not.toBeNull()
    // The expired abandoned session remains until the next create() sweep.
    expect(store.has(abandoned)).toBe(true)
  })

  it('load() refreshes lastAccessedAt so session stays alive', () => {
    const mgr = new InMemorySessionManager()
    const store = getStore(mgr)
    const id = mgr.create('le-militare', { lastGrid: null, freeSpins: null, roundWin: 0 })

    // Artificially age the session
    const raw = store.get(id) as { lastAccessedAt: number }
    const oldTs = Date.now() - 100_000
    raw.lastAccessedAt = oldTs

    mgr.load(id)

    // After a successful load, lastAccessedAt must be refreshed.
    // This means callers don't need a separate save() just to keep
    // the session alive — load() already handles it.
    expect(raw.lastAccessedAt).toBeGreaterThan(oldTs)
  })

  it('create() purges all expired sessions (bulk cleanup)', () => {
    const mgr = new InMemorySessionManager()
    const store = getStore(mgr)

    const abandoned = mgr.create('le-militare', { lastGrid: null, freeSpins: null, roundWin: 0 })
    expire(store, abandoned)

    // Creating a new session triggers bulk purge
    mgr.create('le-militare', { lastGrid: null, freeSpins: null, roundWin: 0 })
    expect(store.has(abandoned)).toBe(false)
  })

  it('create() loops until a unique ID is found (no overwrite)', () => {
    const mgr = new InMemorySessionManager()
    const store = getStore(mgr)

    // Force crypto.randomUUID() to return a known colliding ID first,
    // then fall back to real UUIDs. This simulates an astronomically
    // unlikely collision.
    const original = crypto.randomUUID.bind(crypto)
    const collisionId = '00000000-0000-0000-0000-000000000001'
    store.set(collisionId, {
      gameId: 'woodland-whisper',
      state: {},
      lastAccessedAt: Date.now(),
    })

    const returned: string[] = [collisionId]

    crypto.randomUUID = (() => {
      const next = returned.shift() ?? original()
      return next
    }) as typeof crypto.randomUUID

    try {
      const id = mgr.create('le-militare', { lastGrid: null, freeSpins: null, roundWin: 0 })
      // Must not return the colliding ID — it loops past the collision.
      expect(id).not.toBe(collisionId)
      // The pre-existing session must still be in the store, unclobbered.
      expect(store.has(collisionId)).toBe(true)

      expect((store.get(collisionId) as { gameId: string }).gameId).toBe('woodland-whisper')
    } finally {
      crypto.randomUUID = original
    }
  })
})
