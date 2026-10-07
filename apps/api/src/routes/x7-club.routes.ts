import { Elysia, t } from 'elysia'
import { X7LocalServer, X7RequestError } from '../x7-local-server'

export function x7Backend(value = process.env.X7_BACKEND ?? 'bun'): 'bun' | 'go-rabbit' {
  if (value === 'bun' || value === 'go-rabbit') return value
  throw new Error(`Invalid X7_BACKEND: ${value}. Use bun or go-rabbit.`)
}

/** Identical public endpoints and client contract in either deployment mode. */
export function x7ClubRoutes(
  backend = x7Backend(),
  target = process.env.X7_SERVER_URL ?? 'http://127.0.0.1:3003',
  local = new X7LocalServer(),
) {
  const app = new Elysia()
  if (backend === 'go-rabbit')
    return app.post('/game/x7-club/:action', async ({ params, body, set }) => {
      try {
        const response = await fetch(
          `${target}/game/x7-club/${encodeURIComponent(params.action)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(12_000),
          },
        )
        set.status = response.status
        return (await response.json()) as object
      } catch {
        set.status = 503
        return { error: 'X7 game server unavailable; retry the same request' }
      }
    })
  return app
    .onError(({ code, set }) => {
      if (code === 'VALIDATION' || code === 'PARSE') {
        set.status = 400
        return { error: 'Invalid request JSON' }
      }
    })
    .post(
      '/game/x7-club/:action',
      ({ params, body, set }) => {
        const action = params.action
        if (action !== 'state' && action !== 'spin' && action !== 'buybonus' && action !== 'next') {
          set.status = 404
          return { error: 'Unknown game action' }
        }
        set.headers['Cache-Control'] = 'no-store'
        try {
          return local.handle(action, body)
        } catch (error) {
          if (!(error instanceof X7RequestError)) throw error
          set.status = error.status
          return { error: error.message }
        }
      },
      {
        body: t.Object({
          sessionId: t.Optional(t.String()),
          requestId: t.Optional(t.String()),
          expectedRevision: t.Optional(t.Number({ minimum: 0, multipleOf: 1 })),
          payload: t.Optional(t.Object({ multiplier: t.Optional(t.Number({ multipleOf: 1 })) })),
        }),
      },
    )
}
