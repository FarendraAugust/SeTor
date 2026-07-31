import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { monitorGroups } from './group.schema.js';
export const GroupRepository = {
    findAll() {
        return dbShared.select().from(monitorGroups);
    },
    findById(id) {
        return dbShared.select().from(monitorGroups).where(eq(monitorGroups.id, id)).then((r) => r[0]);
    },
    create(data) {
        return dbShared.insert(monitorGroups).values(data).returning().then((r) => r[0]);
    },
    update(id, data) {
        return dbShared.update(monitorGroups).set(data).where(eq(monitorGroups.id, id)).returning().then((r) => r[0]);
    },
    remove(id) {
        return dbShared.delete(monitorGroups).where(eq(monitorGroups.id, id)).then(() => { });
    },
};
