import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { monitorGroups } from './group.schema.js'
import { ReplicationService } from '../replication/replication.service.js'
import type { MonitorGroup, NewMonitorGroup } from './group.types.js'

export const GroupRepository = {
  findAll(): Promise<MonitorGroup[]> {
    return dbShared.select().from(monitorGroups)
  },

  findById(id: number): Promise<MonitorGroup | undefined> {
    return dbShared.select().from(monitorGroups).where(eq(monitorGroups.id, id)).then((r) => r[0])
  },

  async create(data: Partial<NewMonitorGroup>): Promise<MonitorGroup> {
    const [row] = await dbShared.insert(monitorGroups).values(data as NewMonitorGroup).returning()
    await ReplicationService.record('monitor_groups', 'insert', row as unknown as Record<string, unknown>)
    return row
  },

  async update(id: number, data: Partial<NewMonitorGroup>): Promise<MonitorGroup | undefined> {
    const [row] = await dbShared.update(monitorGroups).set(data).where(eq(monitorGroups.id, id)).returning()
    if (row) await ReplicationService.record('monitor_groups', 'update', row as unknown as Record<string, unknown>)
    return row
  },

  async remove(id: number): Promise<void> {
    await dbShared.delete(monitorGroups).where(eq(monitorGroups.id, id))
    await ReplicationService.record('monitor_groups', 'delete', { id })
  },
} as const
