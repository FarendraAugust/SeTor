import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { maintenanceWindows } from './maintenance.schema.js'
import { ReplicationService } from '../replication/replication.service.js'
import type { MaintenanceWindow, NewMaintenanceWindow } from './maintenance.types.js'

export const MaintenanceRepository = {
  findAll(): Promise<MaintenanceWindow[]> {
    return dbShared.select().from(maintenanceWindows)
  },

  findById(id: number): Promise<MaintenanceWindow | undefined> {
    return dbShared.select().from(maintenanceWindows).where(eq(maintenanceWindows.id, id)).then((r) => r[0])
  },

  async create(data: Partial<NewMaintenanceWindow>): Promise<MaintenanceWindow> {
    const [row] = await dbShared.insert(maintenanceWindows).values(data as NewMaintenanceWindow).returning()
    await ReplicationService.record('maintenance_windows', 'insert', row as unknown as Record<string, unknown>)
    return row
  },

  async update(id: number, data: Partial<NewMaintenanceWindow>): Promise<MaintenanceWindow | undefined> {
    const [row] = await dbShared.update(maintenanceWindows).set(data).where(eq(maintenanceWindows.id, id)).returning()
    if (row) await ReplicationService.record('maintenance_windows', 'update', row as unknown as Record<string, unknown>)
    return row
  },

  async remove(id: number): Promise<void> {
    await dbShared.delete(maintenanceWindows).where(eq(maintenanceWindows.id, id))
    await ReplicationService.record('maintenance_windows', 'delete', { id })
  },
} as const
