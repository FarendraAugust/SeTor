import { Hono } from 'hono';
import { authGuard } from '../auth/auth.guard.js';
import { TargetService } from './target.service.js';
import { validateTarget } from './target.validation.js';
const router = new Hono();
router.get('/', authGuard, async (c) => {
    const targets = await TargetService.list();
    return c.json({ targets });
});
router.post('/', authGuard, async (c) => {
    const input = validateTarget(await c.req.json());
    const target = await TargetService.create(input);
    return c.json({ target }, 201);
});
router.get('/:id', authGuard, async (c) => {
    const target = await TargetService.get(Number(c.req.param('id')));
    return c.json({ target });
});
router.patch('/:id', authGuard, async (c) => {
    const body = await c.req.json();
    const existing = await TargetService.get(Number(c.req.param('id')));
    const merged = validateTarget({ ...existing, ...body });
    const target = await TargetService.update(Number(c.req.param('id')), merged);
    return c.json({ target });
});
router.delete('/:id', authGuard, async (c) => {
    await TargetService.remove(Number(c.req.param('id')));
    return c.json({ ok: true });
});
export default router;
