import { Hono } from 'hono';
import { authGuard } from '../auth/auth.guard.js';
import { BackupService } from './backup.service.js';
const router = new Hono();
router.get('/export', authGuard, async (c) => {
    const data = await BackupService.export();
    return c.json(data);
});
router.post('/import', authGuard, async (c) => {
    const data = await c.req.json();
    const result = await BackupService.import(data);
    return c.json(result);
});
export default router;
