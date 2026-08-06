import { Hono } from 'hono'
import { TargetRepository } from '../target/target.repository.js'
import { MonitorRepository } from './monitor.repository.js'
import { env } from '../../config/env.js'
import { bus } from '../bus/bus.service.js'
import { LeaderService } from '../leader/leader.service.js'
import { AnalysisService } from '../analysis/analysis.service.js'
import { SyncService } from '../internal/sync.service.js'

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
  const row = await MonitorRepository.insert({
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

  await bus.emit('monitoring', 'monitoring.result', {
    targetId: target.id,
    targetName: target.name,
    status,
    responseTime: 0,
    statusCode: null,
    error: status === 'down' ? 'pushed down' : null,
    checkedAt,
  })

  // Leader proses langsung; follower kirim ke leader
  if (LeaderService.isLeader()) {
    void AnalysisService.onResults([row])
  } else {
    void SyncService.pushResults()
  }

  return c.json({ ok: true, status })
})

export default router
