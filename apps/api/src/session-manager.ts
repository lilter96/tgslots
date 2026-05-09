import type { GameId } from './types/game-registry.js'

export interface SessionEntry {
  gameId: GameId
  state: unknown
  lastAccessedAt: number
}

export interface ISessionManager {
  create(gameId: GameId, initialState: unknown): string
  load(sessionId: string): SessionEntry | null
  save(sessionId: string, gameId: GameId, state: unknown): void
  destroy(sessionId: string): void
}
