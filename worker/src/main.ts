import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { bus } from './modules/bus/bus.service.js'

const app = createApp()

serve({
  fetch: app.fetch,
  port: env.port,
  hostname: env.host,
}, (info) => {
  console.log(`worker running on http://${env.host}:${info.port}`)
  console.log(`worker id: ${bus.workerId}`)
})
