import { Hono } from 'hono'
import { authGuard } from '../auth/auth.guard.js'
import { GroupService, validateGroup } from './group.service.js'

const router = new Hono()

router.get('/', authGuard, async (c) => {
  const groups = await GroupService.list()
  return c.json({ groups })
})

router.post('/', authGuard, async (c) => {
  const input = validateGroup(await c.req.json())
  const group = await GroupService.create(input)
  return c.json({ group }, 201)
})

router.get('/:id', authGuard, async (c) => {
  const group = await GroupService.get(Number(c.req.param('id')))
  return c.json({ group })
})

router.patch('/:id', authGuard, async (c) => {
  const body = await c.req.json()
  const existing = await GroupService.get(Number(c.req.param('id')))
  const merged = validateGroup({ ...existing, ...body })
  const group = await GroupService.update(Number(c.req.param('id')), merged)
  return c.json({ group })
})

router.delete('/:id', authGuard, async (c) => {
  await GroupService.remove(Number(c.req.param('id')))
  return c.json({ ok: true })
})

export default router
