import { Hono } from 'hono'
import { authGuard } from '../auth/auth.guard.js'
import { ProxyService, validateProxy } from './proxy.service.js'

const router = new Hono()

router.get('/', authGuard, async (c) => {
  const proxies = await ProxyService.list()
  return c.json({ proxies })
})

router.post('/', authGuard, async (c) => {
  const input = validateProxy(await c.req.json())
  const proxy = await ProxyService.create(input)
  return c.json({ proxy }, 201)
})

router.get('/:id', authGuard, async (c) => {
  const proxy = await ProxyService.get(Number(c.req.param('id')))
  return c.json({ proxy })
})

router.patch('/:id', authGuard, async (c) => {
  const body = await c.req.json()
  const existing = await ProxyService.get(Number(c.req.param('id')))
  const merged = validateProxy({ ...existing, ...body })
  const proxy = await ProxyService.update(Number(c.req.param('id')), merged)
  return c.json({ proxy })
})

router.post('/:id/test', authGuard, async (c) => {
  const result = await ProxyService.test(Number(c.req.param('id')))
  return c.json(result)
})

router.delete('/:id', authGuard, async (c) => {
  await ProxyService.remove(Number(c.req.param('id')))
  return c.json({ ok: true })
})

export default router
