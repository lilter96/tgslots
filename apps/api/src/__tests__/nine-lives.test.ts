import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { createSlotsTestEngine } from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { NineLivesMachine, BET_CONFIG, config } from '@tgslots/nine-lives'
import type { LivesState, LivesResult } from '@tgslots/nine-lives'
import type { RevisionedResponse } from '@tgslots/shared-contracts/revisioned-session'
import { GameServer } from '../dispatcher.js'
import { InMemorySessionManager } from '../in-memory-session-manager.js'
import { NineLivesModule } from '../modules/nine-lives.module.js'
import { AncientDragonModule } from '../modules/ancient-dragon.module.js'
import { createRoutes } from '../routes.js'
const engine = createSlotsTestEngine(NineLivesMachine, BET_CONFIG).build()
type Response = RevisionedResponse<LivesState, LivesResult>
function fixture(module = new NineLivesModule()) {
  const sessions = new InMemorySessionManager()
  const server = new GameServer(sessions, engine.rng(777))
  server.register(module)
  server.register(new AncientDragonModule())
  const app = new Elysia().use(createRoutes(server))
  async function post(action: string, body: object = {}, game = 'nine-lives') {
    const response = await app.handle(
      new Request(`http://localhost/game/${game}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
    return {
      status: response.status,
      body: (await response.json()) as Response & { error?: string },
    }
  }
  return { sessions, server, post }
}
const command = (session: Response, requestId = 'buy') => ({
  sessionId: session.sessionId,
  requestId,
  expectedRevision: session.revision,
  payload: { multiplier: 3 },
})
describe('Nine Lives through common Bun API dispatcher', () => {
  test('generic route creates the registered module and shares session storage', async () => {
    const { sessions, post } = fixture()
    const { status, body } = await post('state')
    expect(status).toBe(200)
    expect(body.balance).toBe(1000000)
    expect(body.revision).toBe(0)
    expect(sessions.load(body.sessionId)?.gameId).toBe('nine-lives')
    const legacy = await post('state', {}, 'ancient-dragon')
    expect(legacy.status).toBe(200)
    expect(legacy.body.balance).toBeUndefined()
    expect((await post('state', { sessionId: body.sessionId }, 'ancient-dragon')).status).toBe(400)
  })
  test('one purchase, full nine lives, restored original stake and balanced wallet', async () => {
    const { post } = fixture()
    const initial = (await post('state')).body
    let current = (await post('buybonus', command(initial))).body
    const purchaseBalance = initial.balance - config.baseCost * config.buyCost * 3
    expect(current.balance).toBe(purchaseBalance)
    expect(current.state.remaining).toBe(9)
    let totalWin = 0
    for (let life = 0; life < 9; life++) {
      const out = await post('next', { ...command(current, `life-${life}`), payload: {} })
      expect(out.status).toBe(200)
      current = out.body
      totalWin += current.result!.win
      expect(current.state.triggeringMultiplier).toBe(3)
      expect(current.balance).toBe(purchaseBalance + totalWin)
      expect(current.revision).toBe(life + 2)
      if (life === 3) {
        const restored = (await post('state', { sessionId: current.sessionId })).body
        expect(restored.result).toBeUndefined()
        expect(restored.state).toEqual(current.state)
        expect(restored.balance).toBe(current.balance)
      }
    }
    expect(current.state.phase).toBe('BASE')
    expect(current.state.remaining).toBe(0)
    expect((await post('next', { ...command(current, 'finished'), payload: {} })).status).toBe(400)
  })
  test('duplicates replay exactly; changed commands and stale revisions reject', async () => {
    const { post } = fixture()
    const initial = (await post('state')).body,
      request = command(initial)
    const first = await post('buybonus', request)
    expect(await post('buybonus', request)).toEqual(first)
    expect((await post('buybonus', { ...request, payload: { multiplier: 2 } })).status).toBe(409)
    expect((await post('next', { ...request, requestId: 'stale', payload: {} })).status).toBe(409)
    const after = (await post('state', { sessionId: initial.sessionId })).body
    expect(after.balance).toBe(first.body.balance)
    expect(after.revision).toBe(1)
  })
  test('invalid wagers, missing identity, insufficient funds and active bonus do not commit', async () => {
    const { post } = fixture()
    const initial = (await post('state')).body
    for (const multiplier of [0, 1.5, 10001, 10000]) {
      const out = await post('buybonus', { ...command(initial), payload: { multiplier } })
      expect(out.status).toBe(400)
      expect((await post('state', { sessionId: initial.sessionId })).body).toEqual(initial)
    }
    expect(
      (await post('spin', { sessionId: initial.sessionId, payload: { multiplier: 1 } })).status,
    ).toBe(400)
    expect((await post('spin', { payload: { multiplier: 1 } })).status).toBe(400)
    const bonus = (await post('buybonus', command(initial))).body
    expect((await post('spin', command(bonus, 'blocked'))).status).toBe(400)
    expect((await post('state', { sessionId: initial.sessionId })).body.state).toEqual(bonus.state)
  })
  test('expired sessions cannot read or retry a previously committed action', async () => {
    const { sessions, post } = fixture()
    const initial = (await post('state')).body
    await post('buybonus', command(initial))
    sessions.load(initial.sessionId)!.lastAccessedAt = 0
    expect((await post('buybonus', command(initial))).status).toBe(404)
    expect((await post('state', { sessionId: initial.sessionId })).status).toBe(404)
  })
  test('dispatcher clones replies and preserves session state on math failure', () => {
    const { server } = fixture()
    const created = server.execute({ gameId: 'nine-lives', action: 'state', payload: {} })
    if (!created.ok) throw new Error(created.error)
    const initial = created.response
    initial.state.remaining = 100
    const restored = server.execute({
      gameId: 'nine-lives',
      action: 'state',
      sessionId: initial.sessionId,
      payload: {},
    })
    if (!restored.ok) throw new Error(restored.error)
    expect(restored.response.state.remaining).toBe(0)
    const module = new NineLivesModule()
    module.execute = (_rng, state) => {
      state.roundWin = 100
      throw new Error('math failure')
    }
    server.register(module)
    expect(() =>
      server.execute({
        gameId: 'nine-lives',
        action: 'spin',
        sessionId: initial.sessionId,
        requestId: 'failure',
        expectedRevision: 0,
        payload: { multiplier: 1 },
      }),
    ).toThrow('math failure')
    expect(
      server.execute({
        gameId: 'nine-lives',
        action: 'state',
        sessionId: initial.sessionId,
        payload: {},
      }),
    ).toEqual(restored)
  })
})
