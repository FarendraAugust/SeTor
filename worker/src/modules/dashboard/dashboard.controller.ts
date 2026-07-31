import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { authGuard } from '../auth/auth.guard.js'
import { bus } from '../bus/bus.service.js'
import { DashboardService } from './dashboard.service.js'

const router = new Hono()

router.get('/', authGuard, async (c) => {
  const data = await DashboardService.overview()
  return c.json(data)
})

router.get('/health', authGuard, async (c) => {
  const health = await DashboardService.health()
  return c.json(health)
})

router.get('/events', authGuard, (c) => {
  return streamSSE(c, async (stream) => {
    const handler = async (event: { type: string; data: unknown; source: string; timestamp: number }) => {
      await stream.writeSSE({
        event: 'message',
        data: JSON.stringify({ type: event.type, data: event.data, source: event.source, timestamp: event.timestamp }),
      })
    }
    await bus.subscribe('monitoring', handler)
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        bus.unsubscribe('monitoring', handler)
        resolve()
      })
    })
  })
})

export default router
