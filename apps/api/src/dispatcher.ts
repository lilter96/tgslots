import type { Rng } from '@tgslots/math/rng/types'
import type { GameId, GameState, ActionType, ActionPayload } from './types/game-registry.js'
import type { ActionRequest, ActionResponse, DispatchOutcome } from './types/actions.js'
import type { IGameModule } from './game-module.js'
import type { ISessionManager, SessionWallet } from './session-manager.js'

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
    let wallet: SessionWallet | undefined

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
      wallet = entry.wallet
    } else {
      if (module.wallet && request.action !== 'state')
        return { ok: false, status: 400, error: 'Create a session first' }
      state = module.defaultState(this.rng)
      wallet = module.wallet
        ? { balance: module.wallet.initialBalance, revision: 0, cache: new Map() }
        : undefined
      sessionId = this.sessions.create(request.gameId, state, wallet)
    }

    if (module.wallet) {
      if (!wallet) return { ok: false, status: 500, error: 'Session wallet is missing' }
      return this.executeWalletAction(module, request, sessionId, state, wallet)
    }

    const error = module.validateAction(
      state,
      request.action,
      request.payload as ActionPayload<G, A>,
    )
    if (error) {
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

  private executeWalletAction<G extends GameId, A extends ActionType<G>>(
    module: IGameModule<G>,
    request: ActionRequest<G, A>,
    sessionId: string,
    state: GameState<G>,
    wallet: SessionWallet,
  ): DispatchOutcome<G> {
    const policy = module.wallet!
    if (request.action === 'state')
      return {
        ok: true,
        response: structuredClone({
          sessionId,
          state,
          balance: wallet.balance,
          revision: wallet.revision,
        }),
      }
    const id = request.requestId
    if (
      !id ||
      id.length > 128 ||
      !Number.isSafeInteger(request.expectedRevision) ||
      request.expectedRevision! < 0
    )
      return { ok: false, status: 400, error: 'Request identity and revision are required' }
    const fingerprint = JSON.stringify([request.action, request.payload, request.expectedRevision])
    const cached = wallet.cache.get(id)
    if (cached) {
      if (cached.fingerprint !== fingerprint)
        return {
          ok: false,
          status: 409,
          error: 'Request identity was reused for a different command',
        }
      return { ok: true, response: structuredClone(cached.response) as ActionResponse<G> }
    }
    if (request.expectedRevision !== wallet.revision)
      return {
        ok: false,
        status: 409,
        error: 'Session revision changed; refresh before continuing',
      }
    const snapshot = structuredClone(state)
    const error = module.validateAction(snapshot, request.action, request.payload)
    if (error) return { ok: false, status: 400, error }
    const cost = policy.cost(request.action, snapshot, request.payload)
    if (!Number.isSafeInteger(cost) || cost < 0)
      return { ok: false, status: 500, error: 'Invalid action cost' }
    if (wallet.balance < cost) return { ok: false, status: 400, error: 'Insufficient demo credits' }
    const next = module.execute(this.rng, snapshot, request.action, request.payload)
    const win = policy.award(next.result)
    const balance = wallet.balance - cost + win
    if (!Number.isSafeInteger(win) || win < 0 || !Number.isSafeInteger(balance))
      return { ok: false, status: 500, error: 'Invalid math award or wallet overflow' }
    const response: ActionResponse<G> = {
      sessionId,
      ...next,
      balance,
      revision: wallet.revision + 1,
    }
    const cache = new Map(wallet.cache)
    cache.set(id, { fingerprint, response: structuredClone(response) })
    if (cache.size > 256) cache.delete(cache.keys().next().value!)
    // No awaits: publish math state, wallet, revision and cached reply together.
    this.sessions.save(sessionId, request.gameId, next.state, {
      balance,
      revision: response.revision!,
      cache,
    })
    return { ok: true, response: structuredClone(response) }
  }
}
