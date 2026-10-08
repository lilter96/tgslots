import { randomUUID } from 'node:crypto'
import type {
  RevisionedResponse,
  RevisionedCommand,
} from '@tgslots/shared-contracts/revisioned-session'
import type { LivesResult, LivesState } from '../packages/games/nine-lives/src/index'
import { config } from '../packages/games/nine-lives/src/index'
type Response = RevisionedResponse<LivesState, LivesResult>
const url = process.env.NINE_LIVES_API_URL ?? 'http://127.0.0.1:3401'
const health = (await (await fetch(`${url}/health`)).json()) as { runtime: string }
if (health.runtime !== 'bun') throw new Error('Expected Bun runtime')
async function request(action: string, body: RevisionedCommand): Promise<Response> {
  const response = await fetch(`${url}/game/nine-lives/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<Response>
}
const session = await request('state', {})
const command = {
  sessionId: session.sessionId,
  requestId: randomUUID(),
  expectedRevision: 0,
  payload: { multiplier: 3 },
}
let response = await request('buybonus', command)
if (response.balance !== session.balance - config.baseCost * config.buyCost * 3)
  throw new Error('Purchase price mismatch')
if (JSON.stringify(await request('buybonus', command)) !== JSON.stringify(response))
  throw new Error('Purchase retry changed response')
const stake = response.state.triggeringMultiplier
let count = 0,
  paid = 0
while (response.state.phase === 'FREE') {
  response = await request('next', {
    sessionId: session.sessionId,
    requestId: randomUUID(),
    expectedRevision: response.revision,
    payload: {},
  })
  paid += response.result!.win
  if (++count > 9) throw new Error('Bonus did not terminate')
  if (response.state.triggeringMultiplier !== stake) throw new Error('Stake changed')
}
if (response.balance !== session.balance - config.baseCost * config.buyCost * 3 + paid)
  throw new Error('Wallet mismatch')
const state = await request('state', { sessionId: session.sessionId })
if (state.balance !== response.balance || state.revision !== response.revision || state.result)
  throw new Error('Restore changed the round')
console.log(
  `Bun API smoke passed: ${count} free spins, ${paid} credits, one ${config.buyCost}× purchase, revision ${state.revision}`,
)
