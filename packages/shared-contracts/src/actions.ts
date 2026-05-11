import type { GameId, GameResult, GameState, ActionType, ActionPayload } from './game-registry.js'

export interface ActionRequest<G extends GameId = GameId, A extends ActionType<G> = ActionType<G>> {
  gameId: G
  action: A
  sessionId?: string
  payload: ActionPayload<G, A>
}

export interface ActionResponse<G extends GameId = GameId> {
  sessionId: string
  result?: GameResult<G>
  state: GameState<G>
}

export type DispatchOutcome<G extends GameId = GameId> =
  | { ok: true; response: ActionResponse<G> }
  | { ok: false; status: number; error: string }
