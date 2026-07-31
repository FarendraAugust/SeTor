import type { notifications } from './notification.schema.js'

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export type NotificationInput = {
  name: string
  type: string
  config?: Record<string, string>
  active?: boolean
  applyTo?: string[]
  customMessage?: string | null
}
