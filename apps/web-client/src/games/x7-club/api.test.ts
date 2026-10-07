import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { initialState } from '@tgslots/x7-club'
import type { ClubResponse } from '@tgslots/x7-club'
import { ClubApi, ClubApiError } from './api'

const originalFetch = globalThis.fetch
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const stored = new Map<string, string>()
const snapshot: ClubResponse = {
  sessionId: 'session-test',
  balance: 10000,
  revision: 0,
  state: initialState(),
}
beforeEach(() => {
  stored.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    },
  })
})
afterEach(() => {
  globalThis.fetch = originalFetch
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
  else Reflect.deleteProperty(globalThis, 'localStorage')
})
function reply(data: object, status = 200) {
  return Response.json(data, { status })
}

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  globalThis.fetch = Object.assign(mock(handler), { preconnect: originalFetch.preconnect })
}

test('lost response survives reload and retries the exact request identity and revision', async () => {
  let saved = ''
  let mutations = 0
  installFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/state')) return reply(snapshot)
    mutations++
    const body = String(init?.body)
    if (mutations === 1) {
      saved = body
      throw new Error('Response lost after server commit')
    }
    expect(body).toBe(saved)
    return reply({ ...snapshot, revision: 1, balance: 9980 })
  })
  const api = new ClubApi()
  await api.restore()
  await expect(api.action('spin', 1)).rejects.toThrow('Response lost')
  expect(api.hasPending).toBe(true)
  await expect(api.action('spin', 1)).rejects.toThrow('pending')
  const reloaded = new ClubApi()
  const recovered = await reloaded.restore()
  expect(recovered.revision).toBe(1)
  expect(recovered.balance).toBe(9980)
  expect(reloaded.hasPending).toBe(false)
  expect(JSON.parse(saved).expectedRevision).toBe(0)
  expect(mutations).toBe(2)
})
test('definite command rejection clears pending identity; unavailable math keeps it for retry', async () => {
  let status = 503
  installFetch(async (input: RequestInfo | URL) =>
    String(input).endsWith('/state') ? reply(snapshot) : reply({ error: 'Rejected' }, status),
  )
  const api = new ClubApi()
  await api.restore()
  await expect(api.action('buybonus', 1)).rejects.toBeInstanceOf(ClubApiError)
  expect(api.hasPending).toBe(true)
  status = 400
  await expect(api.retry()).rejects.toBeInstanceOf(ClubApiError)
  expect(api.hasPending).toBe(false)
})
test('expired sessions create a fresh demo; a pending conflict requires explicit reset', async () => {
  stored.set('tgslots:x7-club:session', 'expired')
  const bodies: string[] = []
  installFetch(async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(String(init?.body))
    return bodies.length === 1 ? reply({ error: 'Expired' }, 404) : reply(snapshot)
  })
  const api = new ClubApi()
  await api.restore()
  expect(JSON.parse(bodies[1]!).sessionId).toBeUndefined()
  installFetch(async () => reply({ error: 'Stale revision' }, 409))
  await expect(api.action('spin', 1)).rejects.toBeInstanceOf(ClubApiError)
  expect(api.hasPending).toBe(true)
  api.resetExpiredSession()
  expect(api.hasPending).toBe(false)
  expect(api.response).toBeNull()
  expect(stored.size).toBe(0)
})
