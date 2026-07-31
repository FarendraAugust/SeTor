import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { statusPages } from './status-page.schema.js';
export const StatusPageRepository = {
    findAll() {
        return dbShared.select().from(statusPages);
    },
    findById(id) {
        return dbShared.select().from(statusPages).where(eq(statusPages.id, id)).then((r) => r[0]);
    },
    findBySlug(slug) {
        return dbShared.select().from(statusPages).where(eq(statusPages.slug, slug)).then((r) => r[0]);
    },
    create(data) {
        return dbShared.insert(statusPages).values(data).returning().then((r) => r[0]);
    },
    update(id, data) {
        return dbShared.update(statusPages).set(data).where(eq(statusPages.id, id)).returning().then((r) => r[0]);
    },
    remove(id) {
        return dbShared.delete(statusPages).where(eq(statusPages.id, id)).then(() => { });
    },
};
