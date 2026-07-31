import type { Monitor, Heartbeat, Certificate, NotificationProvider, StatusPage, MaintenanceWindow, ProxyConfig, ApiKey } from '@/types/monitor'
import type { Status } from '@/types/common'

const certOk: Certificate = {
  issuer: 'R3',
  validFrom: '2025-01-01T00:00:00Z',
  validTo: '2026-01-01T00:00:00Z',
  daysRemaining: 155,
}

const certExpiring: Certificate = {
  issuer: 'R3',
  validFrom: '2024-01-01T00:00:00Z',
  validTo: '2025-03-15T00:00:00Z',
  daysRemaining: 12,
}

const now = Date.now()
const day = 86400000

function generateHeartbeats(count: number, status: Status = 'up'): Heartbeat[] {
  const beats: Heartbeat[] = []
  for (let i = count - 1; i >= 0; i--) {
    const isDown = i > 0 && i % 47 === 0
    beats.push({
      time: new Date(now - i * 60000).toISOString(),
      status: isDown ? 'down' : status,
      responseTime: (i * 7 + 20) % 300 + 20,
    })
  }
  return beats
}

export const mockMonitors: Monitor[] = [
  {
    id: '1',
    name: 'Ubig API',
    url: 'https://api.ubig.my.id',
    type: 'http',
    status: 'up',
    uptime: 99.97,
    responseTime: 145,
    interval: 60,
    timeout: 30,
    retries: 0,
    tags: ['production', 'api'],
    active: true,
    createdAt: new Date(now - 90 * day).toISOString(),
    lastChecked: new Date(now - 30000).toISOString(),
    certificate: certOk,
  },
  {
    id: '2',
    name: 'Main Website',
    url: 'https://ubig.my.id',
    type: 'http',
    status: 'up',
    uptime: 99.89,
    responseTime: 203,
    interval: 60,
    timeout: 30,
    retries: 1,
    tags: ['production', 'web'],
    active: true,
    createdAt: new Date(now - 90 * day).toISOString(),
    lastChecked: new Date(now - 45000).toISOString(),
    certificate: certOk,
  },
  {
    id: '3',
    name: 'Database Server',
    url: 'postgresql://db.ubig.my.id:5432',
    type: 'tcp',
    status: 'up',
    uptime: 100,
    responseTime: 5,
    interval: 60,
    timeout: 10,
    retries: 2,
    tags: ['production', 'database'],
    active: true,
    createdAt: new Date(now - 60 * day).toISOString(),
    lastChecked: new Date(now - 15000).toISOString(),
  },
  {
    id: '4',
    name: 'Redis Cache',
    url: 'redis://cache.ubig.my.id:6379',
    type: 'tcp',
    status: 'down',
    uptime: 78.5,
    responseTime: 0,
    interval: 60,
    timeout: 10,
    retries: 3,
    tags: ['production', 'cache'],
    active: true,
    createdAt: new Date(now - 60 * day).toISOString(),
    lastChecked: new Date(now - 120000).toISOString(),
  },
  {
    id: '5',
    name: 'Staging API',
    url: 'https://staging-api.ubig.my.id',
    type: 'http',
    status: 'up',
    uptime: 99.23,
    responseTime: 178,
    interval: 120,
    timeout: 30,
    retries: 1,
    tags: ['staging', 'api'],
    active: true,
    createdAt: new Date(now - 30 * day).toISOString(),
    lastChecked: new Date(now - 60000).toISOString(),
    certificate: certExpiring,
  },
  {
    id: '6',
    name: 'DNS Server',
    url: '8.8.8.8',
    type: 'dns',
    status: 'up',
    uptime: 100,
    responseTime: 12,
    interval: 300,
    timeout: 10,
    retries: 0,
    tags: ['infrastructure'],
    active: true,
    createdAt: new Date(now - 90 * day).toISOString(),
    lastChecked: new Date(now - 80000).toISOString(),
  },
  {
    id: '7',
    name: 'WebSocket Server',
    url: 'wss://ws.ubig.my.id',
    type: 'websocket',
    status: 'pending',
    uptime: 0,
    responseTime: 0,
    interval: 60,
    timeout: 30,
    retries: 0,
    tags: ['production', 'ws'],
    active: true,
    createdAt: new Date(now - 7 * day).toISOString(),
    lastChecked: new Date(now - 90000).toISOString(),
  },
  {
    id: '8',
    name: 'CDN Edge',
    url: 'https://cdn.ubig.my.id',
    type: 'http',
    status: 'up',
    uptime: 99.99,
    responseTime: 45,
    interval: 60,
    timeout: 30,
    retries: 0,
    tags: ['production', 'cdn'],
    active: true,
    createdAt: new Date(now - 90 * day).toISOString(),
    lastChecked: new Date(now - 35000).toISOString(),
    certificate: certOk,
  },
]

export function getMockHeartbeats(monitorId: string): Heartbeat[] {
  const monitor = mockMonitors.find(m => m.id === monitorId)
  if (!monitor) return []
  return generateHeartbeats(120, monitor.status)
}

export function getMockUptime(monitorId: string, period: string): number {
  const monitor = mockMonitors.find(m => m.id === monitorId)
  if (!monitor) return 0
  const factors: Record<string, number> = {
    '24h': 0.98,
    '7d': 0.95,
    '30d': monitor.uptime / 100,
    '90d': monitor.uptime / 99,
    all: monitor.uptime / 100,
  }
  return Math.min(100, Math.max(0, (factors[period] || 0.99) * 100))
}

export const mockNotificationProviders: NotificationProvider[] = [
  {
    id: 'n1',
    name: 'Dev Team Discord',
    type: 'discord',
    config: { webhookUrl: 'https://discord.com/api/webhooks/...' },
    active: true,
    applyTo: ['1', '2', '3', '5', '8'],
    createdAt: new Date(now - 60 * day).toISOString(),
  },
  {
    id: 'n2',
    name: 'Ops Email Alert',
    type: 'email',
    config: { host: 'smtp.ubig.my.id', port: '587', username: 'alerts@ubig.my.id' },
    active: true,
    applyTo: ['4'],
    createdAt: new Date(now - 30 * day).toISOString(),
  },
  {
    id: 'n3',
    name: 'Telegram Bot',
    type: 'telegram',
    config: { botToken: '...', chatId: '-1001234567890' },
    active: false,
    applyTo: [],
    createdAt: new Date(now - 7 * day).toISOString(),
  },
]

export const mockStatusPages: StatusPage[] = [
  {
    id: 'sp1',
    title: 'UBIG Public Status',
    slug: 'status.ubig.my.id',
    active: true,
    monitors: ['1', '2', '4', '8'],
    description: 'Real-time status of UBIG services',
    showUptime: true,
    showHistory: true,
    createdAt: new Date(now - 90 * day).toISOString(),
  },
  {
    id: 'sp2',
    title: 'API Status',
    slug: 'api-status.ubig.my.id',
    active: false,
    monitors: ['1', '5'],
    description: 'API endpoint status',
    showUptime: true,
    showHistory: false,
    createdAt: new Date(now - 30 * day).toISOString(),
  },
]

export const mockMaintenanceWindows: MaintenanceWindow[] = [
  {
    id: 'mw1',
    title: 'Database Migration',
    description: 'Scheduled PostgreSQL upgrade',
    startTime: new Date(now + 2 * day).toISOString(),
    endTime: new Date(now + 2 * day + 4 * 3600000).toISOString(),
    monitors: ['3'],
    active: true,
    createdAt: new Date(now - 7 * day).toISOString(),
  },
  {
    id: 'mw2',
    title: 'CDN Cache Refresh',
    description: 'Scheduled CDN maintenance window',
    startTime: new Date(now + 7 * day).toISOString(),
    endTime: new Date(now + 7 * day + 2 * 3600000).toISOString(),
    monitors: ['8'],
    active: true,
    createdAt: new Date(now - 1 * day).toISOString(),
  },
]

export const mockProxyConfigs: ProxyConfig[] = [
  {
    id: 'p1',
    name: 'Corporate Proxy',
    protocol: 'http',
    host: 'proxy.ubig.my.id',
    port: 8080,
    auth: { username: 'proxyuser', password: '****' },
  },
]

export const mockApiKeys: ApiKey[] = [
  {
    id: 'ak1',
    name: 'Prometheus Scraper',
    key: 'uk_xxxxxxxxxxxxxxxxxxxx',
    active: true,
    createdAt: new Date(now - 90 * day).toISOString(),
    lastUsed: new Date(now - 3600000).toISOString(),
  },
  {
    id: 'ak2',
    name: 'CI/CD Pipeline',
    key: 'uk_yyyyyyyyyyyyyyyyyyyy',
    active: true,
    createdAt: new Date(now - 30 * day).toISOString(),
    lastUsed: new Date(now - 86400000).toISOString(),
  },
]

export function getAllTags(): string[] {
  const tags = new Set<string>()
  mockMonitors.forEach(m => m.tags.forEach(t => tags.add(t)))
  return Array.from(tags).sort()
}
