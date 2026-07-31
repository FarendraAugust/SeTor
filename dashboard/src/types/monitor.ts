import type { MonitorType, Status } from './common'

export interface Monitor {
  id: string
  name: string
  url: string
  type: MonitorType
  status: Status
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

export interface Heartbeat {
  time: string
  status: Status
  responseTime: number
  message?: string
  ping?: number
}

export interface Certificate {
  issuer: string
  validFrom: string
  validTo: string
  daysRemaining: number
}

export interface MonitorGroup {
  id: string
  name: string
  monitors: string[]
}

export interface NotificationProvider {
  id: string
  name: string
  type: string
  config: Record<string, string>
  active: boolean
  applyTo: string[]
  customMessage?: string
  createdAt: string
}

export interface StatusPage {
  id: string
  title: string
  slug: string
  active: boolean
  monitors: string[]
  customDomain?: string
  theme?: string
  description?: string
  showUptime?: boolean
  showHistory?: boolean
  createdAt: string
}

export interface MaintenanceWindow {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  monitors: string[]
  active: boolean
  createdAt: string
}

export interface BackupData {
  version: string
  exportedAt: string
  monitors: Monitor[]
  notifications: NotificationProvider[]
  statusPages: StatusPage[]
  maintenance: MaintenanceWindow[]
}

export interface ProxyConfig {
  id: string
  name: string
  protocol: 'http' | 'https' | 'socks4' | 'socks5'
  host: string
  port: number
  auth?: { username: string; password: string }
}

export interface ApiKey {
  id: string
  name: string
  key: string
  active: boolean
  createdAt: string
  lastUsed?: string
}

export interface BadgeStyle {
  label: string
  color: string
  style: 'flat' | 'plastic' | 'for-the-badge' | 'social'
}
