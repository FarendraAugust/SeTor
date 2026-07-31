import { Hono } from 'hono';
import { authGuard } from '../auth/auth.guard.js';
import { WorkerService } from './worker.service.js';
const router = new Hono();
router.get('/', authGuard, async (c) => {
    const workers = await WorkerService.list();
    return c.json({ workers });
});
router.get('/me', authGuard, async (c) => {
    const me = await WorkerService.me();
    return c.json({ worker: me });
});
router.get('/:id', authGuard, async (c) => {
    const worker = await WorkerService.get(c.req.param('id'));
    return c.json({ worker });
});
export default router;
