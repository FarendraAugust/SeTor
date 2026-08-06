import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { bus } from './modules/bus/bus.service.js'

// Error async yang tidak tertangkap tidak boleh membunuh node (kritis untuk HA)
process.on('unhandledRejection', (reason) => {
  console.error(`[unhandledRejection ${new Date().toISOString()}]`, reason instanceof Error ? reason.stack ?? reason.message : String(reason))
})
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.stack ?? err?.message ?? String(err))
})

const app = createApp()

serve({
  fetch: app.fetch,
  port: env.port,
  hostname: env.host,
}, (info) => {
  console.log(`worker running on http://${env.host}:${info.port}`)
  console.log(`worker id: ${bus.workerId}`)
})
