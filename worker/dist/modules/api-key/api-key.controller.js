import { Hono } from 'hono';
import { authGuard } from '../auth/auth.guard.js';
import { ApiKeyService, validateApiKey } from './api-key.service.js';
const router = new Hono();
router.get('/', authGuard, async (c) => {
    const apiKeys = await ApiKeyService.list();
    return c.json({ apiKeys });
});
router.post('/', authGuard, async (c) => {
    const input = validateApiKey(await c.req.json());
    const apiKey = await ApiKeyService.create(input);
    return c.json({ apiKey }, 201);
});
router.patch('/:id', authGuard, async (c) => {
    const body = await c.req.json();
    const existing = await ApiKeyService.get(Number(c.req.param('id')));
    const merged = validateApiKey({ ...existing, ...body });
    const apiKey = await ApiKeyService.update(Number(c.req.param('id')), merged);
    return c.json({ apiKey });
});
router.delete('/:id', authGuard, async (c) => {
    await ApiKeyService.remove(Number(c.req.param('id')));
    return c.json({ ok: true });
});
export default router;
