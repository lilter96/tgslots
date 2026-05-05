import { Elysia, t } from 'elysia'
import { jsRng } from '@tgslots/math/rng'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG } from '@tgslots/woodland-whisper/constants'
import { createSession, getSession } from './sessions.js'

const rng = jsRng()

export const woodlandWhisperRouter = new Elysia({ prefix: '/woodlandwhisper' })

  // POST /woodlandwhisper/spin
  // Starts a new round. Creates a session if sessionId is omitted.
  .post(
    '/spin',
    ({ body, set }) => {
      let sessionId: string
      let machine

      if (body.sessionId) {
        const found = getSession(body.sessionId)
        if (!found) {
          set.status = 404
          return { error: 'Session not found or expired' }
        }
        sessionId = body.sessionId
        machine = found
      } else {
        const session = createSession()
        sessionId = session.id
        machine = session.machine
      }

      let wager: Wager
      try {
        wager = new Wager(body.multiplier, BET_CONFIG)
      } catch (e) {
        set.status = 400
        return { error: (e as Error).message }
      }

      const result = machine.spin(rng, wager)
      return { sessionId, result, state: machine.state }
    },
    {
      body: t.Object({
        multiplier: t.Integer({ minimum: 1 }),
        sessionId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Woodland Whisper'],
        summary: 'Start a new round (Base Spin)',
        description: 'Starts a new game round. If sessionId is not provided, a new session is created.',
      },
    },
  )

  // POST /woodlandwhisper/freespin
  // Plays one free spin from an active free spins feature.
  .post(
    '/freespin',
    ({ body, set }) => {
      const machine = getSession(body.sessionId)
      if (!machine) {
        set.status = 404
        return { error: 'Session not found or expired' }
      }
      if (!machine.state.freeSpins || machine.state.freeSpins.spinsRemaining <= 0) {
        set.status = 400
        return { error: 'No free spins remaining' }
      }
      if (machine.state.pickBonus) {
        set.status = 400
        return { error: 'Pick bonus must be completed before playing free spins' }
      }

      const result = machine.freeGameSpin(rng)
      return { result, state: machine.state }
    },
    {
      body: t.Object({ sessionId: t.String() }),
      detail: {
        tags: ['Woodland Whisper'],
        summary: 'Play a Free Spin',
        description: 'Executes one spin from the active Free Spins feature.',
      },
    },
  )

  // POST /woodlandwhisper/pick
  // Submits a pick selection during the pick bonus mini-game.
  .post(
    '/pick',
    ({ body, set }) => {
      const machine = getSession(body.sessionId)
      if (!machine) {
        set.status = 404
        return { error: 'Session not found or expired' }
      }
      if (!machine.state.pickBonus) {
        set.status = 400
        return { error: 'No active pick bonus' }
      }

      const boardSize = machine.state.pickBonus.board.length
      if (body.userIndex < 0 || body.userIndex >= boardSize) {
        set.status = 400
        return { error: `userIndex must be between 0 and ${boardSize - 1}` }
      }

      const result = machine.pickBall(body.userIndex)
      return { result, state: machine.state }
    },
    {
      body: t.Object({
        sessionId: t.String(),
        userIndex: t.Integer({ minimum: 0 }),
      }),
      detail: {
        tags: ['Woodland Whisper'],
        summary: 'Submit a Pick',
        description: 'Submits a selection during the Pick Bonus mini-game.',
      },
    },
  )

  // GET /woodlandwhisper/state?sessionId=...
  // Returns the current game state for session recovery.
  .get(
    '/state',
    ({ query, set }) => {
      const machine = getSession(query.sessionId)
      if (!machine) {
        set.status = 404
        return { error: 'Session not found or expired' }
      }
      return { sessionId: query.sessionId, state: machine.state }
    },
    {
      query: t.Object({ sessionId: t.String() }),
      detail: {
        tags: ['Woodland Whisper'],
        summary: 'Get Current State',
        description: 'Returns the current game state for session recovery or UI sync.',
      },
    },
  )
