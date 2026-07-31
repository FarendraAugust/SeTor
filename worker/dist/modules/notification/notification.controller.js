import { Hono } from 'hono';
import { authGuard } from '../auth/auth.guard.js';
import { NotificationService } from './notification.service.js';
import { validateNotification } from './notification.validation.js';
const router = new Hono();
router.get('/', authGuard, async (c) => {
    const notifications = await NotificationService.list();
    return c.json({ notifications });
});
router.post('/', authGuard, async (c) => {
    const input = validateNotification(await c.req.json());
    const notification = await NotificationService.create(input);
    return c.json({ notification }, 201);
});
router.get('/:id', authGuard, async (c) => {
    const notification = await NotificationService.get(Number(c.req.param('id')));
    return c.json({ notification });
});
router.patch('/:id', authGuard, async (c) => {
    const body = await c.req.json();
    const existing = await NotificationService.get(Number(c.req.param('id')));
    const merged = validateNotification({ ...existing, ...body });
    const notification = await NotificationService.update(Number(c.req.param('id')), merged);
    return c.json({ notification });
});
router.post('/telegram/detect-chat-id', authGuard, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const result = await NotificationService.detectTelegramChatIds(String(body?.botToken ?? ''));
    return c.json(result);
});
router.post('/:id/test', authGuard, async (c) => {
    await NotificationService.test(Number(c.req.param('id')));
    return c.json({ ok: true });
});
router.delete('/:id', authGuard, async (c) => {
    await NotificationService.remove(Number(c.req.param('id')));
    return c.json({ ok: true });
});
export default router;
