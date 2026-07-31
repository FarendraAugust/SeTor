import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { notifications } from './notification.schema.js';
export const NotificationRepository = {
    findAll() {
        return dbShared.select().from(notifications);
    },
    findActive() {
        return dbShared.select().from(notifications).where(eq(notifications.active, true));
    },
    findById(id) {
        return dbShared.select().from(notifications).where(eq(notifications.id, id)).then((r) => r[0]);
    },
    create(data) {
        return dbShared.insert(notifications).values(data).returning().then((r) => r[0]);
    },
    update(id, data) {
        return dbShared.update(notifications).set(data).where(eq(notifications.id, id)).returning().then((r) => r[0]);
    },
    remove(id) {
        return dbShared.delete(notifications).where(eq(notifications.id, id)).then(() => { });
    },
};
