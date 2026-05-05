import type {
  WoodlandWhisperBaseResult,
  WoodlandWhisperBuyResult,
  WoodlandWhisperFreeResult,
  WoodlandWhisperPickResult,
  WoodlandWhisperResult,
  WoodlandWhisperState,
} from '@tgslots/woodland-whisper/game-state-machine'

export interface SpinResponse<T = WoodlandWhisperResult> {
  sessionId: string
  result: T
  state: WoodlandWhisperState
}

export interface ActionResponse<T = WoodlandWhisperResult> {
  result: T
  state: WoodlandWhisperState
}

export interface StateResponse {
  sessionId: string
  state: WoodlandWhisperState
}

export class APIClient {
  private _sessionId: string | null = null
  private _baseUrl: string = 'http://localhost:3001/woodlandwhisper'

  constructor() {
    this._sessionId = localStorage.getItem('tgslots_session_id')
  }

  public get sessionId(): string | null {
    return this._sessionId
  }

  private setSessionId(id: string | null) {
    this._sessionId = id
    if (id) {
      localStorage.setItem('tgslots_session_id', id)
    } else {
      localStorage.removeItem('tgslots_session_id')
    }
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const res = await fetch(`${this._baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(error.error || `HTTP ${res.status}`)
    }

    return res.json()
  }

  public async spin(multiplier: number): Promise<SpinResponse<WoodlandWhisperBaseResult>> {
    const body: Record<string, unknown> = { multiplier }
    if (this._sessionId) body.sessionId = this._sessionId

    const data = await this.request<SpinResponse<WoodlandWhisperBaseResult>>('/spin', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    this.setSessionId(data.sessionId)
    return data
  }

  public async buyBonus(multiplier: number): Promise<SpinResponse<WoodlandWhisperBuyResult>> {
    const body: Record<string, unknown> = { multiplier }
    if (this._sessionId) body.sessionId = this._sessionId

    const data = await this.request<SpinResponse<WoodlandWhisperBuyResult>>('/buybonus', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    this.setSessionId(data.sessionId)
    return data
  }

  public async freeSpin(): Promise<ActionResponse<WoodlandWhisperFreeResult>> {
    if (!this._sessionId) throw new Error('No active session')

    return this.request<ActionResponse<WoodlandWhisperFreeResult>>('/freespin', {
      method: 'POST',
      body: JSON.stringify({ sessionId: this._sessionId }),
    })
  }

  public async pick(userIndex: number): Promise<ActionResponse<WoodlandWhisperPickResult>> {
    if (!this._sessionId) throw new Error('No active session')

    return this.request<ActionResponse<WoodlandWhisperPickResult>>('/pick', {
      method: 'POST',
      body: JSON.stringify({ sessionId: this._sessionId, userIndex }),
    })
  }

  public async getState(sessionId?: string): Promise<StateResponse> {
    const id = sessionId || this._sessionId
    const path = id ? `/state?sessionId=${id}` : '/state'
    const data = await this.request<StateResponse>(path, {
      method: 'GET',
    })
    this.setSessionId(data.sessionId)
    return data
  }
}
