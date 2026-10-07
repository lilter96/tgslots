import { connect } from 'amqplib'
import type { MathCommand, MathReply } from '@tgslots/x7-club'
import { execute } from './execute'

const url = process.env.RABBITMQ_URL ?? 'amqp://x7:x7-demo@127.0.0.1:5672'
const queue = process.env.X7_MATH_QUEUE ?? 'x7.math.v1'
let stopping = false
process.on('SIGTERM', () => {
  stopping = true
  process.exit(0)
})
process.on('SIGINT', () => {
  stopping = true
  process.exit(0)
})

async function serve(): Promise<void> {
  const connection = await connect(url)
  connection.on('error', (error: Error) => console.error('RabbitMQ connection:', error.message))
  const closed = new Promise<void>((resolve) => connection.once('close', resolve))
  const channel = await connection.createConfirmChannel()
  channel.on('error', (error: Error) => console.error('RabbitMQ channel:', error.message))
  channel.once('close', () => connection.close().catch(() => {}))
  await channel.assertQueue(queue, { durable: true, arguments: { 'x-message-ttl': 30_000 } })
  await channel.prefetch(1)
  await channel.consume(
    queue,
    async (message) => {
      if (!message) return
      if (!message.properties.replyTo || !message.properties.correlationId) {
        channel.reject(message, false)
        return
      }
      let reply: MathReply
      try {
        const command = JSON.parse(message.content.toString()) as MathCommand
        try {
          reply = execute(command)
        } catch (error) {
          reply = {
            version: 1,
            requestId: command.requestId,
            error: error instanceof Error ? error.message : 'Math command failed',
          }
        }
      } catch {
        channel.reject(message, false)
        return
      }
      try {
        channel.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(reply)), {
          correlationId: message.properties.correlationId,
          contentType: 'application/json',
        })
        await channel.waitForConfirms()
        channel.ack(message)
      } catch (error) {
        console.error('Math reply failed:', error)
        try {
          channel.nack(message, false, true)
        } catch {
          /* reconnect loop handles closed channels */
        }
      }
    },
    { noAck: false },
  )
  console.log(`X7 math worker ready: ${queue}`)
  await closed
}

while (!stopping) {
  try {
    await serve()
  } catch (error) {
    console.error('Math worker reconnecting:', error)
  }
  if (!stopping) await Bun.sleep(3000)
}
