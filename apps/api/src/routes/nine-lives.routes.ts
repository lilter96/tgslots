import { Elysia, t } from 'elysia'
import { createNineLivesServer } from '../nine-lives-server'
import { SessionError } from '@tgslots/slots-server'
export function nineLivesRoutes() {
  const server = createNineLivesServer()
  return new Elysia().post(
    '/game/nine-lives/:action',
    ({ params, body, set }) => {
      try {
        return server.dispatch(params.action, body)
      } catch (error) {
        set.status = error instanceof SessionError ? error.status : 500
        return { error: error instanceof Error ? error.message : 'Unable to execute spin' }
      }
    },
    {
      params: t.Object({
        action: t.Union([
          t.Literal('state'),
          t.Literal('spin'),
          t.Literal('buybonus'),
          t.Literal('next'),
        ]),
      }),
      body: t.Object({
        sessionId: t.Optional(t.String()),
        requestId: t.Optional(t.String()),
        expectedRevision: t.Optional(t.Number()),
        payload: t.Optional(t.Object({ multiplier: t.Optional(t.Number()) })),
      }),
    },
  )
}
