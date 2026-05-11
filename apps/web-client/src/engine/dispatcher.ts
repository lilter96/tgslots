import type { GameId, ActionType, ActionPayload, ActionResponse } from '@tgslots/shared-contracts'

const SESSION_KEY_PREFIX = 'tgslots:session:'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class GameDispatcher<G extends GameId> {
  private readonly _sessionKey: string

  constructor(
    private readonly _gameId: G,
    private readonly _baseUrl: string,
  ) {
    this._sessionKey = `${SESSION_KEY_PREFIX}${_gameId}`
  }

  get sessionId(): string | null {
    return localStorage.getItem(this._sessionKey)
  }

  async dispatch<A extends ActionType<G>>(
    action: A,
    payload: ActionPayload<G, A>,
  ): Promise<ActionResponse<G>> {
    const sessionId = this.sessionId
    const body: Record<string, unknown> = { payload }
    if (sessionId) body['sessionId'] = sessionId

    const res = await fetch(`${this._baseUrl}/game/${this._gameId}/${String(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Session expired or server restarted — clear the stale id and retry to create a new session
    if (res.status === 404 && sessionId) {
      this.clearSession()
      return this.dispatch(action, payload)
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }))
      throw new ApiError(
        res.status,
        typeof errBody === 'object' && errBody !== null && 'error' in errBody
          ? String((errBody as { error: unknown }).error)
          : `HTTP ${res.status}`,
      )
    }

    const data = (await res.json()) as ActionResponse<G>
    localStorage.setItem(this._sessionKey, data.sessionId)
    return data
  }

  clearSession(): void {
    localStorage.removeItem(this._sessionKey)
  }
}
