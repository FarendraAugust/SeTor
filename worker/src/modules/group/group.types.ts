import type { monitorGroups } from './group.schema.js'

export type MonitorGroup = typeof monitorGroups.$inferSelect
export type NewMonitorGroup = typeof monitorGroups.$inferInsert

export type MonitorGroupInput = {
  name: string
  monitors?: string[]
}
