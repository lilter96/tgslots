import type { ActionResponse } from './types/actions.js'
import type { GameId, GameState } from './types/game-registry.js'

export interface SessionWallet {
  balance: number
  revision: number
  cache: Map<string, { fingerprint: string; response: ActionResponse }>
}

export interface SessionEntry {
  gameId: GameId
  state: GameState<GameId>
  wallet?: SessionWallet
  lastAccessedAt: number
}

export interface ISessionManager {
  create(gameId: GameId, initialState: GameState<GameId>, wallet?: SessionWallet): string
  load(sessionId: string): SessionEntry | null
  save(sessionId: string, gameId: GameId, state: GameState<GameId>, wallet?: SessionWallet): void
  destroy(sessionId: string): void
}
