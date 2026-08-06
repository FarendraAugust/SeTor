import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { notifications } from './notification.schema.js'
import { ReplicationService } from '../replication/replication.service.js'
import type { Notification, NewNotification } from './notification.types.js'

export const NotificationRepository = {
  findAll(): Promise<Notification[]> {
    return dbShared.select().from(notifications)
  },

  findActive(): Promise<Notification[]> {
    return dbShared.select().from(notifications).where(eq(notifications.active, true))
  },

  findById(id: number): Promise<Notification | undefined> {
    return dbShared.select().from(notifications).where(eq(notifications.id, id)).then((r) => r[0])
  },

  async create(data: Partial<NewNotification>): Promise<Notification> {
    const [row] = await dbShared.insert(notifications).values(data as NewNotification).returning()
    await ReplicationService.record('notifications', 'insert', row as unknown as Record<string, unknown>)
    return row
  },

  async update(id: number, data: Partial<NewNotification>): Promise<Notification | undefined> {
    const [row] = await dbShared.update(notifications).set(data).where(eq(notifications.id, id)).returning()
    if (row) await ReplicationService.record('notifications', 'update', row as unknown as Record<string, unknown>)
    return row
  },

  async remove(id: number): Promise<void> {
    await dbShared.delete(notifications).where(eq(notifications.id, id))
    await ReplicationService.record('notifications', 'delete', { id })
  },
} as const
