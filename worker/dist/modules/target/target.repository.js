import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { targets } from './target.schema.js';
export const TargetRepository = {
    findAll() {
        return dbShared.select().from(targets);
    },
    findEnabled() {
        return dbShared.select().from(targets).where(eq(targets.enabled, true));
    },
    findById(id) {
        return dbShared.select().from(targets).where(eq(targets.id, id)).then((r) => r[0]);
    },
    findByPushToken(token) {
        return dbShared.select().from(targets).where(eq(targets.pushToken, token)).then((r) => r[0]);
    },
    create(data) {
        return dbShared.insert(targets).values(data).returning().then((r) => r[0]);
    },
    update(id, data) {
        return dbShared.update(targets)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(targets.id, id))
            .returning()
            .then((r) => r[0]);
    },
    remove(id) {
        return dbShared.delete(targets).where(eq(targets.id, id)).then(() => { });
    },
};
