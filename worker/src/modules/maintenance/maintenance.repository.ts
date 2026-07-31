import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { maintenanceWindows } from './maintenance.schema.js'
import type { MaintenanceWindow, NewMaintenanceWindow } from './maintenance.types.js'

export const MaintenanceRepository = {
  findAll(): Promise<MaintenanceWindow[]> {
    return dbShared.select().from(maintenanceWindows)
  },

  findById(id: number): Promise<MaintenanceWindow | undefined> {
    return dbShared.select().from(maintenanceWindows).where(eq(maintenanceWindows.id, id)).then((r) => r[0])
  },

  create(data: Partial<NewMaintenanceWindow>): Promise<MaintenanceWindow> {
    return dbShared.insert(maintenanceWindows).values(data as NewMaintenanceWindow).returning().then((r) => r[0])
  },

  update(id: number, data: Partial<NewMaintenanceWindow>): Promise<MaintenanceWindow | undefined> {
    return dbShared.update(maintenanceWindows).set(data).where(eq(maintenanceWindows.id, id)).returning().then((r) => r[0])
  },

  remove(id: number): Promise<void> {
    return dbShared.delete(maintenanceWindows).where(eq(maintenanceWindows.id, id)).then(() => {})
  },
} as const
