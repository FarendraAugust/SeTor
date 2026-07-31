import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { notifications } from './notification.schema.js'
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

  create(data: Partial<NewNotification>): Promise<Notification> {
    return dbShared.insert(notifications).values(data as NewNotification).returning().then((r) => r[0])
  },

  update(id: number, data: Partial<NewNotification>): Promise<Notification | undefined> {
    return dbShared.update(notifications).set(data).where(eq(notifications.id, id)).returning().then((r) => r[0])
  },

  remove(id: number): Promise<void> {
    return dbShared.delete(notifications).where(eq(notifications.id, id)).then(() => {})
  },
} as const
