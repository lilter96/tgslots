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
          payload: { multiplier: body.multiplier, mode: body.mode },
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
          mode: t.Optional(t.Union([t.Literal('recon'), t.Literal('assault'), t.Literal('siege')])),
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
          payload: { multiplier: body.multiplier, option: body.option, mode: body.mode },
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
          option: t.Optional(
            t.Union([t.Literal('standard'), t.Literal('elite'), t.Literal('super')]),
          ),
          mode: t.Optional(t.Union([t.Literal('recon'), t.Literal('assault'), t.Literal('siege')])),
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
          description:
            'Purchases a guaranteed Free Spins entry. Tiers: standard, elite (more spins), super (max spins + starting multiplier).',
        },
      },
    )
    .post(
      '/chancespin',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'le-militare',
          action: 'chancespin',
          sessionId: body.sessionId,
          payload: { multiplier: body.multiplier, mode: body.mode },
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
          mode: t.Optional(t.Union([t.Literal('recon'), t.Literal('assault'), t.Literal('siege')])),
          sessionId: t.Optional(t.String()),
        }),
        response: {
          200: LeMilitareSpinResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Le Militare'],
          summary: 'Buy a ×5 Chance spin',
          description: 'One base spin with 5× the Free Spins trigger probability.',
        },
      },
    )
    .post(
      '/airraidspin',
      ({ body, set }) => {
        const out = server.execute({
          gameId: 'le-militare',
          action: 'airraidspin',
          sessionId: body.sessionId,
          payload: { multiplier: body.multiplier, mode: body.mode },
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
          mode: t.Optional(t.Union([t.Literal('recon'), t.Literal('assault'), t.Literal('siege')])),
          sessionId: t.Optional(t.String()),
        }),
        response: {
          200: LeMilitareSpinResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          tags: ['Le Militare'],
          summary: 'Buy a guaranteed Air Raid spin',
          description: 'One base spin where the Air Raid always fires (S300 intercepts planes).',
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
