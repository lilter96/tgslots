import type { Rng } from '@tgslots/math/rng/types'
import type {
  GameId,
  GameState,
  GameResult,
  ActionType,
  ActionPayload,
} from './types/game-registry.js'

export interface IGameModule<G extends GameId> {
  readonly gameId: G

  defaultState(rng: Rng): GameState<G>

  validateAction<A extends ActionType<G>>(
    state: GameState<G>,
    action: A,
    payload: ActionPayload<G, A>,
  ): string | null

  execute<A extends ActionType<G>>(
    rng: Rng,
    state: GameState<G>,
    action: A,
    payload: ActionPayload<G, A>,
  ): { state: GameState<G>; result?: GameResult<G> }
}
