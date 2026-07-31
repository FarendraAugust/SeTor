import { Hono } from 'hono';
import { BadgeService } from './badge.service.js';
const router = new Hono();
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const svg = await BadgeService.forMonitor(id, {
        label: c.req.query('label') ?? 'uptime',
        color: c.req.query('color') ?? 'brightgreen',
        style: c.req.query('style') ?? 'flat',
    });
    return c.body(svg, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' });
});
export default router;
