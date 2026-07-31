import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { proxies } from './proxy.schema.js';
export const ProxyRepository = {
    findAll() {
        return dbShared.select().from(proxies);
    },
    findById(id) {
        return dbShared.select().from(proxies).where(eq(proxies.id, id)).then((r) => r[0]);
    },
    create(data) {
        return dbShared.insert(proxies).values(data).returning().then((r) => r[0]);
    },
    update(id, data) {
        return dbShared.update(proxies).set(data).where(eq(proxies.id, id)).returning().then((r) => r[0]);
    },
    remove(id) {
        return dbShared.delete(proxies).where(eq(proxies.id, id)).then(() => { });
    },
};
