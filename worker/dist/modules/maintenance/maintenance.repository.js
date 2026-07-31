import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { maintenanceWindows } from './maintenance.schema.js';
export const MaintenanceRepository = {
    findAll() {
        return dbShared.select().from(maintenanceWindows);
    },
    findById(id) {
        return dbShared.select().from(maintenanceWindows).where(eq(maintenanceWindows.id, id)).then((r) => r[0]);
    },
    create(data) {
        return dbShared.insert(maintenanceWindows).values(data).returning().then((r) => r[0]);
    },
    update(id, data) {
        return dbShared.update(maintenanceWindows).set(data).where(eq(maintenanceWindows.id, id)).returning().then((r) => r[0]);
    },
    remove(id) {
        return dbShared.delete(maintenanceWindows).where(eq(maintenanceWindows.id, id)).then(() => { });
    },
};
