import { Elysia, t } from 'elysia'
import type { GameServer } from '../dispatcher.js'
import {
  LeMilitareSpinResponseSchema,
  LeMilitareActionResponseSchema,
  LeMilitareStateResponseSchema,
  ErrorResponseSchema,
} from '../dtos.js'

export function leMilitareRoutes(server: GameServer) {
  return new Elysia({ prefix: '/lemilitare' })
    .post(
      '/spin',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'le-militare',
          action: 'spin',
          sessionId: body.sessionId,
          payload: { multiplier: body.multiplier },
        })
        if (!out.ok) {
          set.status = out.status
          return { error: out.error }
        }
        return {
          sessionId: out.response.sessionId,
          result: out.response.result!,
          state: out.response.state,
        }
      },
      {
        body: t.Object({
          multiplier: t.Integer({ minimum: 1 }),
          sessionId: t.Optional(t.String()),
        }),
        response: {
          200: LeMilitareSpinResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Le Militare'],
          summary: 'Start a new round (Base Spin)',
          description:
            'Starts a new cluster-pays cascade round. Returns all cascade steps with Combat Operation events.',
        },
      },
    )
    .post(
      '/buybonus',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'le-militare',
          action: 'buybonus',
          sessionId: body.sessionId,
          payload: { multiplier: body.multiplier },
        })
        if (!out.ok) {
          set.status = out.status
          return { error: out.error }
        }
        return {
          sessionId: out.response.sessionId,
          result: out.response.result!,
          state: out.response.state,
        }
      },
      {
        body: t.Object({
          multiplier: t.Integer({ minimum: 1 }),
          sessionId: t.Optional(t.String()),
        }),
        response: {
          200: LeMilitareSpinResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Le Militare'],
          summary: 'Buy Bonus (guaranteed free spins)',
          description: 'Purchases a guaranteed Free Spins trigger at 100× bet cost.',
        },
      },
    )
    .post(
      '/freespin',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'le-militare',
          action: 'freespin',
          sessionId: body.sessionId,
          payload: {},
        })
        if (!out.ok) {
          set.status = out.status
          return { error: out.error }
        }
        return {
          sessionId: out.response.sessionId,
          result: out.response.result!,
          state: out.response.state,
        }
      },
      {
        body: t.Object({ sessionId: t.String() }),
        response: {
          200: LeMilitareActionResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Le Militare'],
          summary: 'Play a Free Spin',
          description:
            'Executes one free spin. Armed reels and multiplier sum persist across all free spins in the session.',
        },
      },
    )
    .get(
      '/state',
      ({ query, set }) => {
        let out = server.execute({
          gameId: 'le-militare',
          action: 'state',
          sessionId: query.sessionId,
          payload: {},
        })
        if (!out.ok && out.status === 404 && query.sessionId) {
          out = server.execute({
            gameId: 'le-militare',
            action: 'state',
            sessionId: undefined,
            payload: {},
          })
        }
        if (!out.ok) {
          set.status = out.status
          return { error: out.error }
        }
        return { sessionId: out.response.sessionId, state: out.response.state }
      },
      {
        query: t.Object({ sessionId: t.Optional(t.String()) }),
        response: {
          200: LeMilitareStateResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Le Militare'],
          summary: 'Get Current State',
          description: 'Returns current game state including free spin session data.',
        },
      },
    )
}
