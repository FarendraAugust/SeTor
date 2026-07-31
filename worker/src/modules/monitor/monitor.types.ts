import type { monitoring } from './monitor.schema.js'

export type Monitoring = typeof monitoring.$inferSelect
export type NewMonitoring = typeof monitoring.$inferInsert

export type MonitorStats = {
  total: number
  up: number
  down: number
  avgResponseTime: number | null
  uptime: number
  lastCheckedAt: Date | null
}

export type TargetStatus = {
  targetId: number
  targetName: string
  status: string
  responseTime: number | null
  statusCode: number | null
  lastCheckedAt: Date
}
