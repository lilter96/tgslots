import { Elysia, t } from 'elysia'
import type { GameServer } from '../dispatcher.js'
import { ErrorResponseSchema } from '../dtos.js'

const AncientDragonStateSchema = t.Object({
  freeSpins: t.Nullable(
    t.Object({
      totalWin: t.Number(),
      spinsRemaining: t.Number(),
    }),
  ),
})

const AncientDragonResultSchema = t.Union([
  t.Object({
    type: t.Literal('BASE'),
    win: t.Number(),
    sc: t.Number(),
    triggeredFreeSpins: t.Boolean(),
  }),
  t.Object({
    type: t.Literal('FREE'),
    win: t.Number(),
    sc: t.Number(),
    retriggeredFreeSpins: t.Boolean(),
  }),
])

const AncientDragonActionResponseSchema = t.Object({
  sessionId: t.String(),
  result: t.Optional(AncientDragonResultSchema),
  state: AncientDragonStateSchema,
})

export function ancientDragonRoutes(server: GameServer) {
  return new Elysia({ prefix: '/ancientdragon' })
    .post(
      '/spin',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'ancient-dragon',
          action: 'spin',
          sessionId: body.sessionId,
          payload: { multiplier: body.multiplier },
        })
        if (!out.ok) {
          set.status = out.status
          return { error: out.error }
        }
        return out.response
      },
      {
        body: t.Object({
          multiplier: t.Integer({ minimum: 1 }),
          sessionId: t.Optional(t.String()),
        }),
        response: {
          200: AncientDragonActionResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Ancient Dragon'],
          summary: 'Start a new round (Base Spin)',
          description:
            'Starts a new game round. If sessionId is not provided, a new session is created.',
        },
      },
    )
    .post(
      '/freespin',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'ancient-dragon',
          action: 'freespin',
          sessionId: body.sessionId,
          payload: {},
        })
        if (!out.ok) {
          set.status = out.status
          return { error: out.error }
        }
        return out.response
      },
      {
        body: t.Object({ sessionId: t.String() }),
        response: {
          200: AncientDragonActionResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Ancient Dragon'],
          summary: 'Play a Free Spin',
          description: 'Executes one spin from the active Free Spins feature.',
        },
      },
    )
    .get(
      '/state',
      ({ query, set }) => {
        let out = server.execute({
          gameId: 'ancient-dragon',
          action: 'state',
          sessionId: query.sessionId,
          payload: {},
        })
        if (!out.ok && out.status === 404 && query.sessionId) {
          out = server.execute({
            gameId: 'ancient-dragon',
            action: 'state',
            sessionId: undefined,
            payload: {},
          })
        }
        if (!out.ok) {
          set.status = out.status
          return { error: out.error }
        }
        return out.response
      },
      {
        query: t.Object({ sessionId: t.Optional(t.String()) }),
        response: {
          200: AncientDragonActionResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Ancient Dragon'],
          summary: 'Get Current State',
          description:
            'Returns current game state. If sessionId is missing or expired, a new session is created.',
        },
      },
    )
}
