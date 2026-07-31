import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { monitorGroups } from './group.schema.js'
import type { MonitorGroup, NewMonitorGroup } from './group.types.js'

export const GroupRepository = {
  findAll(): Promise<MonitorGroup[]> {
    return dbShared.select().from(monitorGroups)
  },

  findById(id: number): Promise<MonitorGroup | undefined> {
    return dbShared.select().from(monitorGroups).where(eq(monitorGroups.id, id)).then((r) => r[0])
  },

  create(data: Partial<NewMonitorGroup>): Promise<MonitorGroup> {
    return dbShared.insert(monitorGroups).values(data as NewMonitorGroup).returning().then((r) => r[0])
  },

  update(id: number, data: Partial<NewMonitorGroup>): Promise<MonitorGroup | undefined> {
    return dbShared.update(monitorGroups).set(data).where(eq(monitorGroups.id, id)).returning().then((r) => r[0])
  },

  remove(id: number): Promise<void> {
    return dbShared.delete(monitorGroups).where(eq(monitorGroups.id, id)).then(() => {})
  },
} as const
