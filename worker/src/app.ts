import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { env } from './config/env.js'
import { errorHandler } from './common/middleware/error-handler.js'
import { leaderProxy } from './common/middleware/leader-proxy.js'
import { registerModules } from './modules/index.js'

export function createApp() {
  const app = new Hono()

  app.use('*', cors({
    origin: env.corsOrigins,
    credentials: true,
  }))
  app.use('*', logger())
  app.use('*', leaderProxy)
  app.onError(errorHandler)

  registerModules(app)

  return app
}
