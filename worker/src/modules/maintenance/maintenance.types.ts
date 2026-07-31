import type { maintenanceWindows } from './maintenance.schema.js'

export type MaintenanceWindow = typeof maintenanceWindows.$inferSelect
export type NewMaintenanceWindow = typeof maintenanceWindows.$inferInsert

export type MaintenanceWindowInput = {
  title: string
  description?: string
  startTime: string
  endTime: string
  monitors?: string[]
  active?: boolean
}
