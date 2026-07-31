import { Hono } from 'hono';
import { authGuard } from '../auth/auth.guard.js';
import { StatusPageService, validateStatusPage } from './status-page.service.js';
import { MonitorService } from '../monitor/monitor.service.js';
const UPTIME_PERIODS = ['24h', '7d', '30d', '90d'];
const router = new Hono();
router.get('/public/:slug', async (c) => {
    const statusPage = await StatusPageService.getBySlug(c.req.param('slug'));
    const ids = (statusPage.monitors ?? []).map(Number);
    const monitors = await MonitorService.monitors(true);
    const selected = monitors.filter((m) => ids.includes(Number(m.id)));
    const heartbeats = Object.fromEntries(await Promise.all(selected.map(async (m) => [m.id, await MonitorService.heartbeats(Number(m.id), 120)])));
    const uptimes = Object.fromEntries(await Promise.all(selected.map(async (m) => [
        m.id,
        Object.fromEntries(await Promise.all(UPTIME_PERIODS.map(async (p) => [p, await MonitorService.uptime(Number(m.id), p)]))),
    ])));
    return c.json({ statusPage, monitors: selected, heartbeats, uptimes });
});
router.get('/', authGuard, async (c) => {
    const statusPages = await StatusPageService.list();
    return c.json({ statusPages });
});
router.post('/', authGuard, async (c) => {
    const input = validateStatusPage(await c.req.json());
    const statusPage = await StatusPageService.create(input);
    return c.json({ statusPage }, 201);
});
router.get('/:id', authGuard, async (c) => {
    const statusPage = await StatusPageService.get(Number(c.req.param('id')));
    return c.json({ statusPage });
});
router.patch('/:id', authGuard, async (c) => {
    const body = await c.req.json();
    const existing = await StatusPageService.get(Number(c.req.param('id')));
    const merged = validateStatusPage({ ...existing, ...body });
    const statusPage = await StatusPageService.update(Number(c.req.param('id')), merged);
    return c.json({ statusPage });
});
router.delete('/:id', authGuard, async (c) => {
    await StatusPageService.remove(Number(c.req.param('id')));
    return c.json({ ok: true });
});
export default router;
