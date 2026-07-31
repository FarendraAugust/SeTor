import { Hono } from 'hono'
import { TargetRepository } from '../target/target.repository.js'
import { MonitorRepository } from './monitor.repository.js'
import { env } from '../../config/env.js'

const router = new Hono()

router.all('/push/:token', async (c) => {
  const token = c.req.param('token')
  const target = await TargetRepository.findByPushToken(token)
  if (!target) return c.json({ error: 'invalid push token' }, 404)

  let status = 'up'
  const body = await c.req.json().catch(() => null)
  const queryStatus = c.req.query('status')
  if (queryStatus === 'down') status = 'down'
  else if (body && (body.status === 'down' || body.status === 'up')) status = body.status

  const checkedAt = new Date()
  await MonitorRepository.insert({
    targetId: target.id,
    targetName: target.name,
    status,
    responseTime: 0,
    statusCode: null,
    ping: null,
    error: status === 'down' ? 'pushed down' : null,
    checkedAt,
    workerId: env.workerId,
  })

  const { bus } = await import('../bus/bus.service.js')
  await bus.emit('monitoring', 'monitoring.result', {
    targetId: target.id,
    targetName: target.name,
    status,
    responseTime: 0,
    statusCode: null,
    error: status === 'down' ? 'pushed down' : null,
    checkedAt,
  })

  return c.json({ ok: true, status })
})

export default router
