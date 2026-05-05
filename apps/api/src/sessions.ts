import { WoodlandWhisperStateMachine } from '@tgslots/woodland-whisper/game-state-machine'

const SESSION_TTL_MS = 60 * 60 * 1000 // 1 hour

interface SessionEntry {
  machine: WoodlandWhisperStateMachine
  lastAccessedAt: number
}

const store = new Map<string, SessionEntry>()

function purgeExpired(): void {
  const now = Date.now()
  for (const [id, entry] of store) {
    if (now - entry.lastAccessedAt > SESSION_TTL_MS) {
      store.delete(id)
    }
  }
}

export function createSession(): { id: string; machine: WoodlandWhisperStateMachine } {
  purgeExpired()
  const id = crypto.randomUUID()
  const machine = new WoodlandWhisperStateMachine()
  store.set(id, { machine, lastAccessedAt: Date.now() })
  return { id, machine }
}

export function getSession(id: string): WoodlandWhisperStateMachine | null {
  const entry = store.get(id)
  if (!entry) return null
  if (Date.now() - entry.lastAccessedAt > SESSION_TTL_MS) {
    store.delete(id)
    return null
  }
  entry.lastAccessedAt = Date.now()
  return entry.machine
}
