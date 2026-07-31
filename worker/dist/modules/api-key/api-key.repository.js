import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { apiKeys } from './api-key.schema.js';
export const ApiKeyRepository = {
    findAll() {
        return dbShared.select().from(apiKeys);
    },
    findById(id) {
        return dbShared.select().from(apiKeys).where(eq(apiKeys.id, id)).then((r) => r[0]);
    },
    findByKey(key) {
        return dbShared.select().from(apiKeys).where(eq(apiKeys.key, key)).then((r) => r[0]);
    },
    create(data) {
        return dbShared.insert(apiKeys).values(data).returning().then((r) => r[0]);
    },
    update(id, data) {
        return dbShared.update(apiKeys).set(data).where(eq(apiKeys.id, id)).returning().then((r) => r[0]);
    },
    touch(id) {
        return dbShared.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, id)).then(() => { });
    },
    remove(id) {
        return dbShared.delete(apiKeys).where(eq(apiKeys.id, id)).then(() => { });
    },
};
