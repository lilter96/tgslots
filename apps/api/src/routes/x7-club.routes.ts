import { Elysia } from 'elysia'

/** Keep the shared public API URL while Go owns all X7 sessions and actions. */
export function x7ClubRoutes() {
  const target = process.env.X7_SERVER_URL ?? 'http://127.0.0.1:3003'
  return new Elysia().post('/game/x7-club/:action', async ({ params, body, set }) => {
    try {
      const response = await fetch(`${target}/game/x7-club/${encodeURIComponent(params.action)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
      })
      set.status = response.status
      return (await response.json()) as object
    } catch {
      set.status = 503
      return { error: 'X7 game server unavailable; retry the same request' }
    }
  })
}
