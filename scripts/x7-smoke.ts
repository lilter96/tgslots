import type { ClubResponse } from '../packages/games/x7-club/src/index'
import { config } from '../packages/games/x7-club/src/index'

const url = process.env.X7_SMOKE_URL ?? 'http://127.0.0.1:3003'
async function post(action: string, body: object): Promise<ClubResponse> {
  const response = await fetch(`${url}/game/x7-club/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${action}: ${response.status} ${await response.text()}`)
  return response.json() as Promise<ClubResponse>
}
let current = await post('state', { payload: {} })
let boosts = 0
let respins = 0
async function action(name: string): Promise<void> {
  const request = {
    sessionId: current.sessionId,
    requestId: crypto.randomUUID(),
    expectedRevision: current.revision,
    payload: name === 'next' ? {} : { multiplier: 1 },
  }
  const before = current.balance
  const response = await post(name, request)
  const duplicate = await post(name, request)
  if (JSON.stringify(response) !== JSON.stringify(duplicate))
    throw new Error('Duplicate changed response')
  const cost =
    name === 'spin' ? config.baseCost : name === 'buybonus' ? config.baseCost * config.buyCost : 0
  if (response.balance !== before - cost + (response.result?.win ?? 0))
    throw new Error('Wallet mismatch')
  if (response.revision !== current.revision + 1) throw new Error('Revision mismatch')
  if (response.result?.boost) boosts++
  else if (name === 'next') respins++
  current = response
}
async function finishBonus(): Promise<void> {
  for (let count = 0; current.state.bonus; count++) {
    if (count >= 100) throw new Error('Bonus failed to terminate')
    await action('next')
  }
}
await action('spin')
await finishBonus()
await action('buybonus')
if (current.state.bonus?.coins.length !== 6) throw new Error('Wrong buy entry')
await finishBonus()
console.log(
  JSON.stringify(
    {
      status: 'ok',
      server: url,
      revision: current.revision,
      balance: current.balance,
      respins,
      boosts,
      duplicateCheck: 'identical responses and one wallet debit',
    },
    null,
    2,
  ),
)
