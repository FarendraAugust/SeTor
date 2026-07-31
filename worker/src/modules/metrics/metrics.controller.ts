import { Hono } from 'hono'
import { apiKeyOrJwtGuard } from '../api-key/api-key.guard.js'
import { MetricsService } from './metrics.service.js'

const router = new Hono()

router.get('/', apiKeyOrJwtGuard, async (c) => {
  const body = await MetricsService.render()
  return c.body(body, 200, { 'Content-Type': 'text/plain; version=0.0.4' })
})

export default router
