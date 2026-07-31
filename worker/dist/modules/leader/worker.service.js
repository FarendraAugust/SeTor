import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../common/errors/http-error.js';
import { workers } from './leader.schema.js';
const ONLINE_TIMEOUT = 45_000;
function withStatus(w) {
    const isOnline = Date.now() - w.lastHeartbeat.getTime() < ONLINE_TIMEOUT;
    return { ...w, isOnline };
}
export const WorkerService = {
    async list() {
        const rows = await dbShared.select().from(workers);
        return rows.map(withStatus);
    },
    async get(id) {
        const [worker] = await dbShared.select().from(workers).where(eq(workers.id, id));
        if (!worker)
            throw HttpError.notFound('worker not found');
        return withStatus(worker);
    },
    async me() {
        const [worker] = await dbShared.select().from(workers).where(eq(workers.id, env.workerId));
        if (!worker)
            throw HttpError.notFound('worker not found');
        return withStatus(worker);
    },
};
