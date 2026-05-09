import type { Rng } from '@tgslots/math/rng/types'
import type { GameId, GameState, ActionType, ActionPayload } from './types/game-registry.js'
import type { ActionRequest, ActionResponse, DispatchOutcome } from './types/actions.js'
import type { IGameModule } from './game-module.js'
import type { ISessionManager } from './session-manager.js'

export class GameServer {
  private readonly modules = new Map<string, IGameModule<GameId>>()

  constructor(
    private readonly sessions: ISessionManager,
    private readonly rng: Rng,
  ) {}

  register<G extends GameId>(module: IGameModule<G>): void {
    this.modules.set(module.gameId, module as IGameModule<GameId>)
  }

  execute<G extends GameId, A extends ActionType<G>>(
    request: ActionRequest<G, A>,
  ): DispatchOutcome<G> {
    const module = this.modules.get(request.gameId) as IGameModule<G> | undefined
    if (!module) {
      return { ok: false, status: 400, error: `Unknown game: ${request.gameId}` }
    }

    let sessionId: string
    let state: GameState<G>

    if (request.sessionId) {
      const entry = this.sessions.load(request.sessionId)
      if (!entry) {
        return { ok: false, status: 404, error: 'Session not found or expired' }
      }
      if (entry.gameId !== request.gameId) {
        return { ok: false, status: 400, error: 'Session belongs to a different game' }
      }
      sessionId = request.sessionId
      state = entry.state as GameState<G>
    } else {
      state = module.defaultState(this.rng)
      sessionId = this.sessions.create(request.gameId, state)
    }

    const error = module.validateAction(
      state,
      request.action,
      request.payload as ActionPayload<G, A>,
    )
    if (error) {
      this.sessions.save(sessionId, request.gameId, state)
      return { ok: false, status: 400, error }
    }

    const next = module.execute(
      this.rng,
      state,
      request.action,
      request.payload as ActionPayload<G, A>,
    )
    this.sessions.save(sessionId, request.gameId, next.state)

    return {
      ok: true,
      response: { sessionId, result: next.result, state: next.state } as ActionResponse<G>,
    }
  }
}
