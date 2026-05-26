import type { ISessionManager, SessionEntry } from './session-manager.js'
import type { GameId, GameState } from './types/game-registry.js'

const SESSION_TTL_MS = 60 * 60 * 1000

export class InMemorySessionManager implements ISessionManager {
  private readonly store = new Map<string, SessionEntry>()

  create(gameId: GameId, initialState: GameState<GameId>): string {
    this.purgeExpired()
    let id: string
    do {
      id = crypto.randomUUID()
    } while (this.store.has(id))
    this.store.set(id, { gameId, state: initialState, lastAccessedAt: Date.now() })
    return id
  }

  load(sessionId: string): SessionEntry | null {
    const entry = this.store.get(sessionId)
    if (!entry) return null
    if (Date.now() - entry.lastAccessedAt > SESSION_TTL_MS) {
      this.store.delete(sessionId)
      return null
    }
    entry.lastAccessedAt = Date.now()
    return entry
  }

  save(sessionId: string, gameId: GameId, state: GameState<GameId>): void {
    this.store.set(sessionId, { gameId, state, lastAccessedAt: Date.now() })
  }

  destroy(sessionId: string): void {
    this.store.delete(sessionId)
  }

  private purgeExpired(): void {
    const now = Date.now()
    for (const [id, entry] of this.store) {
      if (now - entry.lastAccessedAt > SESSION_TTL_MS) {
        this.store.delete(id)
      }
    }
  }
}
