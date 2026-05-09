import { Elysia, t } from 'elysia'
import type { GameServer } from '../dispatcher.js'
import {
  SpinResponseSchema,
  ActionResponseSchema,
  StateResponseSchema,
  ErrorResponseSchema,
} from '../dtos.js'

export function woodlandWhisperRoutes(server: GameServer) {
  return new Elysia({ prefix: '/woodlandwhisper' })
    .post(
      '/spin',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'woodland-whisper',
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
          200: SpinResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Woodland Whisper'],
          summary: 'Start a new round (Base Spin)',
          description:
            'Starts a new game round. If sessionId is not provided, a new session is created.',
        },
      },
    )
    .post(
      '/buybonus',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'woodland-whisper',
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
          200: SpinResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Woodland Whisper'],
          summary: 'Buy Bonus',
          description:
            'Purchases a guaranteed bonus trigger. If sessionId is not provided, a new session is created.',
        },
      },
    )
    .post(
      '/freespin',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'woodland-whisper',
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
          200: ActionResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Woodland Whisper'],
          summary: 'Play a Free Spin',
          description: 'Executes one spin from the active Free Spins feature.',
        },
      },
    )
    .post(
      '/pick',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'woodland-whisper',
          action: 'pick',
          sessionId: body.sessionId,
          payload: { userIndex: body.userIndex },
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
          sessionId: t.String(),
          userIndex: t.Integer({ minimum: 0 }),
        }),
        response: {
          200: ActionResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Woodland Whisper'],
          summary: 'Submit a Pick',
          description: 'Submits a selection during the Pick Bonus mini-game.',
        },
      },
    )
    .get(
      '/state',
      ({ query, set }) => {
        let out = server.execute({
          gameId: 'woodland-whisper',
          action: 'state',
          sessionId: query.sessionId,
          payload: {},
        })
        if (!out.ok && out.status === 404 && query.sessionId) {
          out = server.execute({
            gameId: 'woodland-whisper',
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
          200: StateResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Woodland Whisper'],
          summary: 'Get Current State',
          description:
            'Returns current game state. If sessionId is missing or expired, a new session is created.',
        },
      },
    )
}
