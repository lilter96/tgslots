import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { jsRng } from '@tgslots/math/rng'
import { GameServer } from './dispatcher.js'
import { InMemorySessionManager } from './in-memory-session-manager.js'
import { WoodlandWhisperModule } from './modules/woodland-whisper.module.js'
import { AncientDragonModule } from './modules/ancient-dragon.module.js'
import { createRoutes } from './routes.js'
import { woodlandWhisperRoutes } from './routes/woodland-whisper.routes.js'
import { ancientDragonRoutes } from './routes/ancient-dragon.routes.js'
import { leMilitareRoutes } from './routes/le-militare.routes.js'
import { LeMilitareModule } from './modules/le-militare.module.js'

const sessions = new InMemorySessionManager()
const rng = jsRng()
const server = new GameServer(sessions, rng)

server.register(new WoodlandWhisperModule())
server.register(new AncientDragonModule())
server.register(new LeMilitareModule())

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'TG Slots API',
          version: '2.0.0',
          description: 'Multi-game slot platform API — stateless dispatcher architecture',
        },
      },
    }),
  )
  .use(createRoutes(server))
  .use(woodlandWhisperRoutes(server))
  .use(ancientDragonRoutes(server))
  .use(leMilitareRoutes(server))
  .onError(({ error, set }) => {
    set.status = 500
    return { error: error instanceof Error ? error.message : 'Internal server error' }
  })
  .listen({
    port: Number(process.env.PORT) || 3001,
    hostname: '0.0.0.0',
  })

console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`)
