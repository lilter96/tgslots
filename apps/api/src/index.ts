import { Elysia } from 'elysia'
import { woodlandWhisperRouter } from './woodland-whisper.js'

const app = new Elysia()
  .use(woodlandWhisperRouter)
  .onError(({ error, set }) => {
    set.status = 500
    return { error: error instanceof Error ? error.message : 'Internal server error' }
  })
  .listen(3001)

console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`)
