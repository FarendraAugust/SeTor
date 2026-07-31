import { Hono } from 'hono'
import { authGuard } from '../auth/auth.guard.js'
import { MaintenanceService, validateMaintenance } from './maintenance.service.js'

const router = new Hono()

router.get('/', authGuard, async (c) => {
  const maintenance = await MaintenanceService.list()
  return c.json({ maintenance })
})

router.post('/', authGuard, async (c) => {
  const input = validateMaintenance(await c.req.json())
  const window = await MaintenanceService.create(input)
  return c.json({ maintenance: window }, 201)
})

router.get('/:id', authGuard, async (c) => {
  const window = await MaintenanceService.get(Number(c.req.param('id')))
  return c.json({ maintenance: window })
})

router.patch('/:id', authGuard, async (c) => {
  const body = await c.req.json()
  const existing = await MaintenanceService.get(Number(c.req.param('id')))
  const merged = validateMaintenance({ ...existing, ...body })
  const window = await MaintenanceService.update(Number(c.req.param('id')), merged)
  return c.json({ maintenance: window })
})

router.delete('/:id', authGuard, async (c) => {
  await MaintenanceService.remove(Number(c.req.param('id')))
  return c.json({ ok: true })
})

export default router
