import type { GameId, GameState } from './types/game-registry.js'

export interface SessionEntry {
  gameId: GameId
  state: GameState<GameId>
  lastAccessedAt: number
}

export interface ISessionManager {
  create(gameId: GameId, initialState: GameState<GameId>): string
  load(sessionId: string): SessionEntry | null
  save(sessionId: string, gameId: GameId, state: GameState<GameId>): void
  destroy(sessionId: string): void
}
