import type { ClubAction, ClubResponse } from '@tgslots/x7-club'

interface PendingRequest {
  action: Exclude<ClubAction, 'state'>
  body: {
    sessionId: string
    requestId: string
    expectedRevision: number
    payload: { multiplier?: number }
  }
}
const SESSION_KEY = 'tgslots:x7-club:session'
const PENDING_KEY = 'tgslots:x7-club:pending'
export class ClubApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}
/** A failed action retains its request identity, including across reloads. */
export class ClubApi {
  response: ClubResponse | null = null
  private sessionId = ''
  private pending: PendingRequest | null = null
  constructor(private readonly baseUrl = '') {
    try {
      this.sessionId = localStorage.getItem(SESSION_KEY) ?? ''
      const saved = localStorage.getItem(PENDING_KEY)
      if (saved) this.pending = JSON.parse(saved) as PendingRequest
    } catch {
      /* In-memory sessions still work when storage is unavailable. */
    }
  }
  get hasPending(): boolean {
    return this.pending !== null
  }
  async restore(): Promise<ClubResponse> {
    if (this.pending) return this.retry()
    try {
      return await this.fetch('state', { sessionId: this.sessionId, payload: {} })
    } catch (error) {
      if (!(error instanceof ClubApiError) || error.status !== 404) throw error
      this.sessionId = ''
      return this.fetch('state', { payload: {} })
    }
  }
  async action(action: Exclude<ClubAction, 'state'>, multiplier: number): Promise<ClubResponse> {
    if (this.pending) throw new Error('Retry the pending action first')
    if (!this.response) throw new Error('Session is not ready')
    this.pending = {
      action,
      body: {
        sessionId: this.sessionId,
        requestId: crypto.randomUUID(),
        expectedRevision: this.response.revision,
        payload: action === 'next' ? {} : { multiplier },
      },
    }
    this.savePending()
    return this.retry()
  }
  async retry(): Promise<ClubResponse> {
    if (!this.pending) return this.restore()
    try {
      const response = await this.fetch(this.pending.action, this.pending.body)
      this.pending = null
      this.savePending()
      return response
    } catch (error) {
      // 400 is a validated, unexecuted command. Transport/502/503 errors remain ambiguous.
      if (error instanceof ClubApiError && error.status === 400) {
        this.pending = null
        this.savePending()
      }
      throw error
    }
  }
  resetExpiredSession(): void {
    this.pending = null
    this.sessionId = ''
    this.response = null
    try {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(PENDING_KEY)
    } catch {
      /* optional storage */
    }
  }
  private savePending(): void {
    try {
      if (this.pending) localStorage.setItem(PENDING_KEY, JSON.stringify(this.pending))
      else localStorage.removeItem(PENDING_KEY)
    } catch {
      /* In-memory pending identity remains available. */
    }
  }
  private async fetch(action: ClubAction, body: object): Promise<ClubResponse> {
    const response = await fetch(`${this.baseUrl}/game/x7-club/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) {
      const error = (await response.json()) as { error?: string }
      throw new ClubApiError(response.status, error.error ?? `HTTP ${response.status}`)
    }
    const data = (await response.json()) as ClubResponse
    this.sessionId = data.sessionId
    this.response = data
    try {
      localStorage.setItem(SESSION_KEY, data.sessionId)
    } catch {
      /* optional storage */
    }
    return data
  }
}
