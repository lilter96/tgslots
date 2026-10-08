import { Elysia, t } from 'elysia'
import type { GameServer } from './dispatcher.js'
import type { GameId, ActionType, ActionPayload } from './types/game-registry.js'

export function createRoutes(server: GameServer) {
  return new Elysia().post(
    '/game/:gameId/:action',
    ({ params, body, set }) => {
      const out = server.execute({
        gameId: params.gameId as GameId,
        action: params.action as ActionType<GameId>,
        sessionId: body.sessionId,
        requestId: body.requestId,
        expectedRevision: body.expectedRevision,
        payload: (body.payload ?? {}) as ActionPayload<GameId, ActionType<GameId>>,
      })
      if (!out.ok) {
        set.status = out.status
        return { error: out.error }
      }
      return out.response
    },
    {
      params: t.Object({
        gameId: t.String(),
        action: t.String(),
      }),
      body: t.Object({
        sessionId: t.Optional(t.String()),
        requestId: t.Optional(t.String({ maxLength: 128 })),
        expectedRevision: t.Optional(t.Integer({ minimum: 0 })),
        payload: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
      detail: {
        tags: ['Game Actions'],
        summary: 'Execute a game action (generic)',
        description:
          'Dispatches an action to the appropriate game module. Use /payload for action arguments.',
      },
    },
  )
}
