import { expect, test } from 'bun:test'
import { RevisionedSessionServer } from './index'
const make = (clock = Date.now) =>
  new RevisionedSessionServer(
    {
      initialState: () => ({ spins: 0 }),
      cost: () => 20,
      execute: (_action, state: { spins: number }) => ({
        state: { spins: state.spins + 1 },
        result: { win: 5 },
      }),
    },
    clock,
  )
test('retries return the exact response and mutate wallet/state once', () => {
  const server = make(),
    session = server.dispatch('state', {})
  const command = {
    sessionId: session.sessionId,
    requestId: 'same',
    expectedRevision: 0,
    payload: { multiplier: 1 },
  }
  const first = server.dispatch('spin', command)
  expect(server.dispatch('spin', command)).toEqual(first)
  expect(first.balance).toBe(999985)
  expect(first.state.spins).toBe(1)
  expect(() => server.dispatch('spin', { ...command, payload: { multiplier: 2 } })).toThrow(
    'reused',
  )
  expect(() => server.dispatch('spin', { ...command, requestId: 'different' })).toThrow('revision')
  expect(server.dispatch('state', { sessionId: session.sessionId }).revision).toBe(1)
})
test('responses are isolated from callers and reads contain no replayed result', () => {
  const server = make(),
    session = server.dispatch('state', {})
  session.state.spins = 100
  expect(server.dispatch('state', { sessionId: session.sessionId }).state.spins).toBe(0)
  const command = { sessionId: session.sessionId, requestId: 'a', expectedRevision: 0 }
  const result = server.dispatch('spin', command)
  result.state.spins = 100
  expect(server.dispatch('spin', command).state.spins).toBe(1)
  expect(server.dispatch('state', { sessionId: session.sessionId }).result).toBeUndefined()
})
test('expired sessions cannot mutate or retry; malformed identities and wagers reject', () => {
  let now = 0
  const server = make(() => now),
    session = server.dispatch('state', {})
  const command = { sessionId: session.sessionId, requestId: 'a', expectedRevision: 0 }
  for (const multiplier of [0, 1.2, NaN, 10001])
    expect(() => server.dispatch('spin', { ...command, payload: { multiplier } })).toThrow()
  expect(() => server.dispatch('spin', { sessionId: session.sessionId })).toThrow()
  now = 3600001
  expect(() => server.dispatch('spin', command)).toThrow('expired')
})
test('insufficient funds and failed math leave the entire session uncommitted', () => {
  const server = new RevisionedSessionServer({
    initialState: () => ({ spins: 0 }),
    cost: () => 1000001,
    execute: () => ({ state: { spins: 1 }, result: { win: 0 } }),
  })
  const s = server.dispatch('state', {})
  expect(() =>
    server.dispatch('spin', { sessionId: s.sessionId, requestId: 'a', expectedRevision: 0 }),
  ).toThrow('Insufficient')
  expect(server.dispatch('state', { sessionId: s.sessionId })).toEqual({ ...s, result: undefined })
  const failing = new RevisionedSessionServer({
    initialState: () => ({ spins: 0 }),
    cost: () => 20,
    execute: () => {
      throw new Error('math failure')
    },
  })
  const initial = failing.dispatch('state', {})
  expect(() =>
    failing.dispatch('spin', { sessionId: initial.sessionId, requestId: 'a', expectedRevision: 0 }),
  ).toThrow('math failure')
  expect(failing.dispatch('state', { sessionId: initial.sessionId })).toEqual(initial)
})
