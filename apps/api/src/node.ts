import { createServer } from 'node:http'
import { jsRng } from '@tgslots/math/rng'
import { GameServer } from './dispatcher'
import { InMemorySessionManager } from './in-memory-session-manager'
import { WoodlandWhisperModule } from './modules/woodland-whisper.module'
import { AncientDragonModule } from './modules/ancient-dragon.module'
import { LeMilitareModule } from './modules/le-militare.module'
import { createNineLivesServer } from './nine-lives-server'
import { SessionError } from '@tgslots/slots-server'
import type {
  RevisionedAction,
  RevisionedCommand,
} from '@tgslots/shared-contracts/revisioned-session'
import type { GameId, ActionType, ActionPayload } from './types/game-registry'
const games = new GameServer(new InMemorySessionManager(), jsRng())
games.register(new WoodlandWhisperModule())
games.register(new AncientDragonModule())
games.register(new LeMilitareModule())
const lives = createNineLivesServer()
const app = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  const send = (status: number, body: object) => {
    response.statusCode = status
    response.end(JSON.stringify(body))
  }
  const origin = process.env.CLIENT_ORIGIN
  if (origin && request.headers.origin === origin)
    response.setHeader('Access-Control-Allow-Origin', origin)
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    response.writeHead(204)
    response.end()
    return
  }
  if (request.method === 'GET' && request.url === '/health') {
    send(200, { ok: true, runtime: 'node', game: 'nine-lives' })
    return
  }
  const match = /^\/game\/([a-z0-9-]+)\/([a-z]+)$/.exec((request.url ?? '').split('?')[0]!)
  if (request.method !== 'POST' || !match) {
    send(404, { error: 'Route not found' })
    return
  }
  try {
    let raw = ''
    for await (const chunk of request) {
      raw += String(chunk)
      if (Buffer.byteLength(raw) > 16384) throw new SessionError(413, 'Request too large')
    }
    let body: RevisionedCommand
    try {
      body = JSON.parse(raw || '{}') as RevisionedCommand
    } catch {
      throw new SessionError(400, 'Invalid JSON')
    }
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new SessionError(400, 'Expected a JSON object')
    if (body.sessionId !== undefined && typeof body.sessionId !== 'string')
      throw new SessionError(400, 'Invalid session identity')
    if (body.requestId !== undefined && typeof body.requestId !== 'string')
      throw new SessionError(400, 'Invalid request identity')
    if (
      body.payload !== undefined &&
      (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload))
    )
      throw new SessionError(400, 'Invalid action payload')
    const [, _pathGame, action] = match
    if (_pathGame === 'nine-lives') {
      if (!['state', 'spin', 'buybonus', 'next'].includes(action!))
        throw new SessionError(400, 'Unsupported action')
      send(200, lives.dispatch(action as RevisionedAction, body))
      return
    }
    if (_pathGame === 'x7-club') {
      const upstream = await fetch(
        `${process.env.X7_SERVER_URL ?? 'http://localhost:3003'}/game/x7-club/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: raw,
          signal: AbortSignal.timeout(12000),
        },
      )
      response.statusCode = upstream.status
      response.end(await upstream.text())
      return
    }
    const result = games.execute({
      gameId: _pathGame as GameId,
      action: action as ActionType<GameId>,
      sessionId: body.sessionId,
      payload: (body.payload ?? {}) as ActionPayload<GameId, ActionType<GameId>>,
    })
    if (!result.ok) send(result.status, { error: result.error })
    else send(200, result.response)
  } catch (error) {
    send(error instanceof SessionError ? error.status : 500, {
      error: error instanceof Error ? error.message : 'Unable to process action',
    })
  }
})
const port = Number(process.env.PORT ?? 3401)
app.listen(port, process.env.HOST ?? '127.0.0.1', () =>
  console.log(`Node slot API listening on http://127.0.0.1:${port}`),
)
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => app.close(() => process.exit(0)))
