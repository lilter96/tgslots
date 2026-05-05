import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { woodlandWhisperRouter } from './woodland-whisper.js'

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'TG Slots API',
          version: '1.0.0',
          description: 'API for tgslots game simulations and sessions',
        },
      },
    }),
  )
  .use(woodlandWhisperRouter)
  .onError(({ error, set }) => {
    set.status = 500
    return { error: error instanceof Error ? error.message : 'Internal server error' }
  })
  .listen(3001)

console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`)
