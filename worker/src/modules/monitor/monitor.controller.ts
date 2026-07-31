import { Hono } from 'hono'
import { authGuard } from '../auth/auth.guard.js'
import { MonitorService } from './monitor.service.js'
import { TargetService } from '../target/target.service.js'
import { validateTarget } from '../target/target.validation.js'
import { MonitorRepository } from './monitor.repository.js'

const router = new Hono()

router.get('/monitors', authGuard, async (c) => {
  const includeAll = c.req.query('all') === '1' || c.req.query('all') === 'true'
  const monitors = await MonitorService.monitors(includeAll)
  return c.json({ monitors })
})

router.post('/monitors', authGuard, async (c) => {
  const input = validateTarget(await c.req.json())
  const target = await TargetService.create(input)
  const monitor = await MonitorService.monitorById(target.id)
  return c.json({ monitor }, 201)
})

router.get('/monitors/tags', authGuard, async (c) => {
  const tags = await MonitorService.allTags()
  return c.json({ tags })
})

router.get('/monitors/:id', authGuard, async (c) => {
  const monitor = await MonitorService.monitorById(Number(c.req.param('id')))
  return c.json({ monitor })
})

router.patch('/monitors/:id', authGuard, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const existing = await TargetService.get(id)
  const merged = validateTarget({ ...existing, ...body })
  await TargetService.update(id, merged)
  const monitor = await MonitorService.monitorById(id)
  return c.json({ monitor })
})

router.delete('/monitors/:id', authGuard, async (c) => {
  const id = Number(c.req.param('id'))
  await TargetService.remove(id)
  await MonitorRepository.removeByTarget(id)
  return c.json({ ok: true })
})

router.get('/monitors/:id/heartbeats', authGuard, async (c) => {
  const targetId = Number(c.req.param('id'))
  const limit = Math.min(Number(c.req.query('limit') ?? 120), 500)
  const heartbeats = await MonitorService.heartbeats(targetId, limit)
  return c.json({ heartbeats })
})

router.get('/monitors/:id/uptime', authGuard, async (c) => {
  const targetId = Number(c.req.param('id'))
  const period = c.req.query('period') ?? '30d'
  const uptime = await MonitorService.uptime(targetId, period)
  return c.json({ uptime })
})

router.post('/monitors/:id/check', authGuard, async (c) => {
  const target = await TargetService.get(Number(c.req.param('id')))
  const result = await MonitorService.checkTarget(target)
  return c.json({ result })
})

router.get('/stats', authGuard, async (c) => {
  const stats = await MonitorService.stats()
  return c.json({ stats })
})

router.get('/', authGuard, async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200)
  const results = await MonitorService.recent(limit)
  return c.json({ results })
})

router.get('/targets', authGuard, async (c) => {
  const statuses = await MonitorService.targets()
  return c.json({ targets: statuses })
})

router.get('/timeline/:targetId', authGuard, async (c) => {
  const targetId = Number(c.req.param('targetId'))
  await TargetService.get(targetId)
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500)
  const timeline = await MonitorService.timeline(targetId, limit)
  return c.json({ timeline })
})

router.post('/check/:targetId', authGuard, async (c) => {
  const target = await TargetService.get(Number(c.req.param('targetId')))
  const result = await MonitorService.checkTarget(target)
  return c.json({ result })
})

export default router
