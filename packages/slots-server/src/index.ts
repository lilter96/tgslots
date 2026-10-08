import { randomBytes, randomUUID } from 'node:crypto'
import type {
  RevisionedAction,
  RevisionedCommand,
  RevisionedResponse,
} from '@tgslots/shared-contracts/revisioned-session'
export class SessionError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}
export interface SessionGame<S, R extends { win: number }> {
  initialState(): S
  cost(action: Exclude<RevisionedAction, 'state'>, state: S, multiplier: number): number
  execute(
    action: Exclude<RevisionedAction, 'state'>,
    state: S,
    multiplier: number,
    seed: number,
  ): { state: S; result: R }
}
interface Entry<S, R> {
  response: RevisionedResponse<S, R>
  accessed: number
  cache: Map<string, { fingerprint: string; response: RevisionedResponse<S, R> }>
}
/** Synchronous commit boundary: state, wallet and revision publish together before any HTTP await. */
export class RevisionedSessionServer<S, R extends { win: number }> {
  private sessions = new Map<string, Entry<S, R>>()
  constructor(
    private readonly game: SessionGame<S, R>,
    private readonly clock = Date.now,
  ) {}
  dispatch(action: RevisionedAction, command: RevisionedCommand): RevisionedResponse<S, R> {
    const now = this.clock()
    let entry: Entry<S, R>
    if (!command.sessionId) {
      if (action !== 'state') throw new SessionError(400, 'Create a session first')
      for (const [id, current] of this.sessions)
        if (now - current.accessed > 3600000) this.sessions.delete(id)
      if (this.sessions.size >= 5000) throw new SessionError(503, 'Demo session capacity reached')
      const sessionId = randomUUID()
      entry = {
        response: { sessionId, balance: 1000000, revision: 0, state: this.game.initialState() },
        accessed: now,
        cache: new Map(),
      }
      this.sessions.set(sessionId, entry)
    } else {
      const found = this.sessions.get(command.sessionId)
      if (!found || now - found.accessed > 3600000) {
        this.sessions.delete(command.sessionId)
        throw new SessionError(404, 'Session not found or expired')
      }
      entry = found
      entry.accessed = now
    }
    if (action === 'state') return structuredClone({ ...entry.response, result: undefined })
    const id = command.requestId
    if (!id || id.length > 128 || !Number.isSafeInteger(command.expectedRevision))
      throw new SessionError(400, 'Request identity and revision are required')
    const multiplier = command.payload?.multiplier ?? 1
    if (!Number.isSafeInteger(multiplier) || multiplier < 1 || multiplier > 10000)
      throw new SessionError(400, 'Bet multiplier must be an integer from 1 to 10000')
    const fingerprint = JSON.stringify([action, multiplier, command.expectedRevision])
    const cached = entry.cache.get(id)
    if (cached) {
      if (cached.fingerprint !== fingerprint)
        throw new SessionError(409, 'Request identity was reused for a different command')
      return structuredClone(cached.response)
    }
    if (command.expectedRevision !== entry.response.revision)
      throw new SessionError(409, 'Session revision changed; refresh before continuing')
    const cost = this.game.cost(action, entry.response.state, multiplier)
    if (!Number.isSafeInteger(cost) || cost < 0) throw new SessionError(500, 'Invalid action cost')
    if (entry.response.balance < cost) throw new SessionError(400, 'Insufficient demo credits')
    const next = this.game.execute(
      action,
      structuredClone(entry.response.state),
      multiplier,
      randomBytes(4).readUInt32LE(),
    )
    if (!Number.isSafeInteger(next.result.win) || next.result.win < 0)
      throw new SessionError(500, 'Invalid math award')
    const balance = entry.response.balance - cost + next.result.win
    if (!Number.isSafeInteger(balance)) throw new SessionError(500, 'Wallet overflow')
    const response = {
      sessionId: entry.response.sessionId,
      balance,
      revision: entry.response.revision + 1,
      ...next,
    }
    entry.response = response
    entry.cache.set(id, { fingerprint, response: structuredClone(response) })
    if (entry.cache.size > 256) entry.cache.delete(entry.cache.keys().next().value!)
    return structuredClone(response)
  }
}
