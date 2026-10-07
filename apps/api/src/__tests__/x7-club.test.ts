import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { config, X7ClubMachine, BET_CONFIG } from '@tgslots/x7-club'
import type { ClubAction, ClubResponse } from '@tgslots/x7-club'
import { createSlotsTestEngine } from '../../../../packages/slots-simulation-engine/src/testing/slots-test-engine'
import { X7LocalServer } from '../x7-local-server'
import type { ClubRequest } from '../x7-local-server'
import { x7Backend, x7ClubRoutes } from '../routes/x7-club.routes'

const engine = createSlotsTestEngine(X7ClubMachine, BET_CONFIG).build()
function fixture(seed = 77) {
  const app = new Elysia().use(x7ClubRoutes('bun', '', new X7LocalServer(() => seed)))
  const post = (action: string, body: object) =>
    app.handle(
      new Request(`http://localhost/game/x7-club/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  return { app, post }
}
async function read(response: Promise<Response>): Promise<ClubResponse> {
  const res = await response
  expect(res.status).toBe(200)
  return res.json() as Promise<ClubResponse>
}
function stateSnapshot(current: ClubResponse): ClubResponse {
  const response = structuredClone(current)
  delete response.result
  return response
}
function command(current: ClubResponse, multiplier = 1): ClubRequest {
  return {
    sessionId: current.sessionId,
    requestId: crypto.randomUUID(),
    expectedRevision: current.revision,
    payload: { multiplier },
  }
}

describe('X7 selectable backend', () => {
  test('selects only explicit modes and fails on a typo', () => {
    expect(x7Backend('bun')).toBe('bun')
    expect(x7Backend('go-rabbit')).toBe('go-rabbit')
    expect(() => x7Backend('go-rabit')).toThrow('Invalid X7_BACKEND')
  })

  test('local HTTP spin matches the seeded math engine and duplicate debits only once', async () => {
    const { post } = fixture()
    const initial = await read(post('state', { payload: {} }))
    const request = command(initial, 3)
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => read(post('spin', request))),
    )
    for (const response of responses) expect(response).toEqual(responses[0]!)
    const result = responses[0]!
    const machine = engine.createMachine(initial.state)
    expect(result.result).toEqual(machine.spin(engine.rng(77), engine.wager(3)))
    expect(result.state).toEqual(machine.state)
    expect(result.balance).toBe(initial.balance - config.baseCost * 3 + result.result!.win)
    expect(result.revision).toBe(1)
    const restored = await read(post('state', { sessionId: initial.sessionId }))
    expect(restored).toEqual(stateSnapshot(result))
    expect((await post('spin', { ...request, payload: { multiplier: 2 } })).status).toBe(409)
    expect((await post('spin', command(initial))).status).toBe(409)
    expect(await read(post('state', { sessionId: initial.sessionId }))).toEqual(
      stateSnapshot(result),
    )
  })

  test('complete buy bonus uses identical seeded transitions, stake and wallet accounting', async () => {
    const { post } = fixture(2)
    let current = await read(post('state', {}))
    const machine = engine.createMachine(current.state)
    const before = current.balance
    const request = command(current, 7)
    current = await read(post('buybonus', request))
    expect(current.result).toEqual(machine.buyBonus(engine.wager(7)))
    expect(current.balance).toBe(before - config.baseCost * config.buyCost * 7)
    expect(current.state).toEqual(machine.state)
    expect((await post('spin', command(current))).status).toBe(400)
    expect((await post('buybonus', command(current))).status).toBe(400)
    let paid = 0
    let boosts = 0
    for (let step = 0; current.state.bonus; step++) {
      expect(step).toBeLessThan(100)
      const previous = current
      const nextRequest = command(current, 999)
      current = await read(post('next', nextRequest))
      expect(current.result).toEqual(machine.next(engine.rng(2))!)
      expect(current.state).toEqual(machine.state)
      expect(current.balance).toBe(previous.balance + current.result!.win)
      expect(current.revision).toBe(previous.revision + 1)
      expect(await read(post('next', nextRequest))).toEqual(current)
      if (current.result!.boost) boosts++
      if (current.state.bonus) expect(current.result!.win).toBe(0)
      paid += current.result!.win
    }
    expect(boosts).toBeGreaterThan(0)
    expect(current.result!.bonusEnded).toBe(true)
    expect(current.balance).toBe(before - config.baseCost * config.buyCost * 7 + paid)
    expect((await post('next', command(current))).status).toBe(400)
  })

  test('invalid inputs, unknown sessions and insufficient credits cannot mutate wallet', async () => {
    const { post } = fixture()
    const initial = await read(post('state', {}))
    for (const multiplier of [0, -1, 1.5, 10001, '1'])
      expect((await post('spin', { ...command(initial), payload: { multiplier } })).status).toBe(
        400,
      )
    expect((await post('buybonus', command(initial, 10000))).status).toBe(400)
    expect((await post('spin', { payload: { multiplier: 1 } })).status).toBe(400)
    expect((await post('spin', { ...command(initial), expectedRevision: -1 })).status).toBe(400)
    expect((await post('spin', { ...command(initial), requestId: 'short' })).status).toBe(400)
    expect((await post('spin', { ...command(initial), sessionId: 'expired' })).status).toBe(404)
    expect((await post('unknown', {})).status).toBe(404)
    expect(await read(post('state', { sessionId: initial.sessionId }))).toEqual(initial)
  })

  test('expired sessions return 404, cached snapshots cannot mutate state', () => {
    let now = 0
    const server = new X7LocalServer(
      () => 77,
      () => now,
    )
    const initial = server.handle('state', {})
    initial.state.lastGrid[0]![0] = 999
    const valid = server.handle('state', { sessionId: initial.sessionId })
    expect(valid.state.lastGrid[0]![0]).toBe(0)
    now = 3_600_001
    expect(() => server.handle('state', { sessionId: initial.sessionId })).toThrow(
      'Session expired',
    )
    expect(server.handle('state', {}).sessionId).not.toBe(initial.sessionId)
  })

  test('an evicted old request cannot execute twice', () => {
    const server = new X7LocalServer(() => 77)
    let current = server.handle('state', {})
    const original = command(current)
    current = server.handle('buybonus', original)
    for (let step = 0; current.revision <= 256; step++) {
      expect(step).toBeLessThan(1000)
      const action: ClubAction = current.state.bonus ? 'next' : 'spin'
      current = server.handle(action, command(current))
    }
    expect(() => server.handle('buybonus', original)).toThrow('Stale revision')
    expect(server.handle('state', { sessionId: current.sessionId })).toEqual(stateSnapshot(current))
  })

  test('Go proxy preserves requests, responses and failure status without falling back', async () => {
    const upstream = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      async fetch(request) {
        const body = (await request.json()) as ClubRequest
        expect(new URL(request.url).pathname).toBe('/game/x7-club/spin')
        expect(body.requestId).toBe('request-123')
        expect(body.expectedRevision).toBe(4)
        return Response.json({ error: 'Stale revision; refresh state' }, { status: 409 })
      },
    })
    try {
      const app = new Elysia().use(x7ClubRoutes('go-rabbit', `http://127.0.0.1:${upstream.port}`))
      const response = await app.handle(
        new Request('http://localhost/game/x7-club/spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: 'request-123', expectedRevision: 4 }),
        }),
      )
      expect(response.status).toBe(409)
      expect(await response.json()).toEqual({ error: 'Stale revision; refresh state' })
    } finally {
      upstream.stop(true)
    }
    const app = new Elysia().use(x7ClubRoutes('go-rabbit', `http://127.0.0.1:${upstream.port}`))
    const unavailable = await app.handle(
      new Request('http://localhost/game/x7-club/state', { method: 'POST', body: '{}' }),
    )
    expect(unavailable.status).toBe(503)
  })
})
