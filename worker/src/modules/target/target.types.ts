import type { targets } from './target.schema.js'

export type Target = typeof targets.$inferSelect
export type NewTarget = typeof targets.$inferInsert

export type MonitorType = 'http' | 'ping' | 'tcp' | 'dns' | 'keyword' | 'websocket' | 'json-query' | 'push' | 'steam' | 'docker'
export type MonitorStatus = 'up' | 'down' | 'pending' | 'unknown'

export type Certificate = {
  issuer: string
  validFrom: string
  validTo: string
  daysRemaining: number
}

export type Monitor = {
  id: string
  name: string
  url: string
  type: MonitorType
  status: MonitorStatus
  uptime: number
  responseTime: number
  interval: number
  timeout: number
  retries: number
  tags: string[]
  active: boolean
  createdAt: string
  lastChecked: string
  certificate?: Certificate
  notificationIds?: string[]
  description?: string
  dockerContainer?: string
  pushToken?: string
  steamGameId?: string
  jsonQuery?: string
  expectedValue?: string
  proxyId?: string
  upsideDown?: boolean
  maxredirects?: number
  ignoreTls?: boolean
  resendNotification?: boolean
  notificationInterval?: number
  notificationThreshold?: number
}

export type Heartbeat = {
  time: string
  status: MonitorStatus
  responseTime: number
  message?: string
  ping?: number
}

export type TargetInput = {
  name: string
  url: string
  type?: MonitorType
  method?: string
  interval?: number
  timeout?: number
  retries?: number
  tags?: string[]
  enabled?: boolean
  maxRedirects?: number
  ignoreTls?: boolean
  upsideDown?: boolean
  description?: string | null
  notificationIds?: string[]
  dockerContainer?: string | null
  pushToken?: string | null
  steamGameId?: string | null
  jsonQuery?: string | null
  expectedValue?: string | null
  proxyId?: string | null
  resendNotification?: boolean
  notificationInterval?: number | null
  notificationThreshold?: number | null
}
