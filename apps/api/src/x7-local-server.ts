import { config, initialState } from '@tgslots/x7-club'
import type { ClubAction, ClubResponse } from '@tgslots/x7-club'
import { execute } from '@tgslots/x7-club/execute'

export interface ClubRequest {
  sessionId?: string
  requestId?: string
  expectedRevision?: number
  payload?: { multiplier?: number }
}
interface Session {
  response: ClubResponse
  touched: number
  cache: Map<string, { fingerprint: string; response: ClubResponse }>
}
export class X7RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/** In-process demo backend. Execution and wallet commit are synchronous and atomic. */
export class X7LocalServer {
  private readonly sessions = new Map<string, Session>()

  constructor(
    private readonly seed = () => crypto.getRandomValues(new Uint32Array(1))[0]!,
    private readonly now = () => Date.now(),
  ) {}

  handle(action: ClubAction, request: ClubRequest): ClubResponse {
    if (action !== 'state' && !request.sessionId)
      throw new X7RequestError(400, 'Create a session with state first')
    const session = this.session(request.sessionId)
    if (action === 'state') {
      const response = structuredClone(session.response)
      delete response.result
      return response
    }
    const { requestId, expectedRevision } = request
    if (
      !requestId ||
      requestId.length < 8 ||
      requestId.length > 128 ||
      expectedRevision === undefined
    )
      throw new X7RequestError(400, 'requestId and expectedRevision are required')
    const fingerprint = JSON.stringify([action, request.payload?.multiplier ?? 0, expectedRevision])
    const previous = session.cache.get(requestId)
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new X7RequestError(409, 'requestId was already used for another command')
      return structuredClone(previous.response)
    }
    const current = session.response
    if (expectedRevision !== current.revision)
      throw new X7RequestError(409, 'Stale revision; refresh state')
    if (action === 'next' && current.state.phase === 'BASE')
      throw new X7RequestError(400, 'No active bonus')
    if (action !== 'next' && current.state.phase !== 'BASE')
      throw new X7RequestError(400, 'Finish the active bonus first')
    const multiplier =
      action === 'next' ? current.state.triggeringMultiplier : (request.payload?.multiplier ?? 0)
    if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 10000)
      throw new X7RequestError(400, 'Multiplier must be 1..10000')
    const cost =
      action === 'next'
        ? 0
        : config.baseCost * multiplier * (action === 'buybonus' ? config.buyCost : 1)
    if (cost > current.balance) throw new X7RequestError(400, 'Insufficient demo credits')
    const reply = execute({
      version: 1,
      requestId,
      action,
      multiplier,
      seed: this.seed(),
      state: current.state,
    })
    if (!reply.state || !reply.result) throw new Error('Missing local math result')
    const response: ClubResponse = {
      sessionId: current.sessionId,
      balance: current.balance - cost + reply.result.win,
      revision: current.revision + 1,
      state: reply.state,
      result: reply.result,
    }
    session.response = response
    session.cache.set(requestId, { fingerprint, response })
    if (session.cache.size > 256) session.cache.delete(session.cache.keys().next().value!)
    return structuredClone(response)
  }

  private session(id?: string): Session {
    const now = this.now()
    for (const [key, session] of this.sessions)
      if (now - session.touched > 60 * 60 * 1000) this.sessions.delete(key)
    if (id) {
      const session = this.sessions.get(id)
      if (!session) throw new X7RequestError(404, 'Session expired; reload to start a new demo')
      session.touched = now
      return session
    }
    if (this.sessions.size >= 5000) throw new X7RequestError(503, 'Demo session capacity reached')
    const session: Session = {
      response: {
        sessionId: crypto.randomUUID(),
        balance: 1_000_000,
        revision: 0,
        state: initialState(),
      },
      touched: now,
      cache: new Map(),
    }
    this.sessions.set(session.response.sessionId, session)
    return session
  }
}
