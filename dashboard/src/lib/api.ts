import type { AuthUser } from '@/types/auth'
import type { WorkerRow } from '@/types/worker'
import type {
  ApiKey,
  BackupData,
  Heartbeat,
  MaintenanceWindow,
  Monitor,
  MonitorGroup,
  NotificationProvider,
  ProxyConfig,
  StatusPage,
} from '@/types/monitor'
import type { MonitorType } from '@/types/common'

export const WORKER_URL = (process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://localhost:3001').replace(/\/+$/, '')

/** Daftar worker URLs untuk failover cluster: comma-separated (NEXT_PUBLIC_WORKER_URLS) */
export const WORKER_URLS = (process.env.NEXT_PUBLIC_WORKER_URLS ?? WORKER_URL)
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean)

let currentWorkerIndex = 0

export function getWorkerUrl(): string {
  return WORKER_URLS[Math.min(currentWorkerIndex, WORKER_URLS.length - 1)]
}

function rotateWorkerUrl(): string {
  currentWorkerIndex = (currentWorkerIndex + 1) % WORKER_URLS.length
  return getWorkerUrl()
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

async function requestOnce<T>(url: string, path: string, init: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  }
  if (init.body) headers['Content-Type'] = 'application/json'
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${url}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data?.error ?? data?.message ?? `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }
  return data as T
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const attempts = WORKER_URLS.length
  for (let i = 0; i < attempts; i++) {
    const url = getWorkerUrl()
    try {
      return await requestOnce<T>(url, path, init)
    } catch (e: any) {
      const isNetworkError = !(e instanceof ApiError)
      const isLeaderDown = e instanceof ApiError && (e.status === 503 || e.status === 502)
      if (isNetworkError || isLeaderDown) {
        rotateWorkerUrl()
        continue
      }
      throw e
    }
  }
  throw new ApiError(503, 'All workers unreachable')
}

export const workerApi = {
  list() {
    return request<{ workers: WorkerRow[] }>('/workers')
  },
}

export const authApi = {
  register(body: { name: string; email: string; password: string }) {
    return request<{ accessToken: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  login(body: { email: string; password: string }) {
    return request<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  refresh() {
    return request<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
  },

  logout() {
    return request<{ ok: boolean }>('/auth/logout', { method: 'POST' })
  },

  me() {
    return request<{ user: AuthUser }>('/auth/me')
  },

  updateProfile(body: { name: string }) {
    return request<{ user: AuthUser }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  changePassword(body: { currentPassword: string; newPassword: string }) {
    return request<{ ok: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}

export interface MonitorInput {
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

interface MonitorWire {
  id: string
  name: string
  url: string
  type: string
  status: string
  uptime: number
  responseTime: number
  interval: number
  timeout: number
  retries: number
  tags: string[]
  active: boolean
  createdAt: string
  lastChecked: string
  certificate?: { issuer: string; validFrom: string; validTo: string; daysRemaining: number }
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

function toMonitor(w: MonitorWire): Monitor {
  return {
    ...w,
    id: String(w.id),
    type: (w.type as Monitor['type']) || 'http',
    status: (w.status as Monitor['status']) || 'pending',
    notificationIds: w.notificationIds?.map(String),
  }
}

interface HeartbeatWire {
  time: string
  status: string
  responseTime: number
  message?: string
  ping?: number
}

interface NotificationWire {
  id: number
  name: string
  type: string
  config: Record<string, string> | null
  active: boolean
  applyTo: string[] | null
  customMessage?: string | null
  createdAt: string | Date
}

interface StatusPageWire {
  id: number
  title: string
  slug: string
  active: boolean
  monitors: string[] | null
  customDomain?: string | null
  theme?: string | null
  description?: string | null
  showUptime?: boolean | null
  showHistory?: boolean | null
  createdAt?: string | Date | null
}

interface MaintenanceWire {
  id: number
  title: string
  description: string | null
  startTime: string | Date
  endTime: string | Date
  monitors: string[] | null
  active: boolean
  createdAt: string | Date | null
}

interface ProxyWire {
  id: number
  name: string
  protocol: string
  host: string
  port: number
  auth: { username: string; password: string } | null
}

interface ApiKeyWire {
  id: number
  name: string
  key: string
  active: boolean
  createdAt: string | Date
  lastUsed: string | Date | null
}

interface GroupWire {
  id: number
  name: string
  monitors: string[] | null
}

interface BackupWire {
  version: string
  exportedAt: string
  monitors: MonitorWire[]
  notifications: NotificationWire[]
  statusPages: StatusPageWire[]
  maintenance: MaintenanceWire[]
  groups?: GroupWire[]
  proxies?: ProxyWire[]
}

function toHeartbeat(h: HeartbeatWire): Heartbeat {
  return { ...h, status: (h.status as Heartbeat['status']) || 'unknown' }
}

function toStatusPage(sp: StatusPageWire): StatusPage {
  return {
    id: String(sp.id),
    title: sp.title,
    slug: sp.slug,
    active: sp.active ?? true,
    monitors: (sp.monitors ?? []).map(String),
    customDomain: sp.customDomain ?? undefined,
    theme: sp.theme ?? undefined,
    description: sp.description ?? undefined,
    showUptime: sp.showUptime ?? undefined,
    showHistory: sp.showHistory ?? undefined,
    createdAt: sp.createdAt ? new Date(sp.createdAt).toISOString() : new Date().toISOString(),
  }
}

function toNotification(n: NotificationWire): NotificationProvider {
  return {
    id: String(n.id),
    name: n.name,
    type: n.type,
    config: n.config ?? {},
    active: n.active ?? true,
    applyTo: (n.applyTo ?? []).map(String),
    customMessage: n.customMessage ?? undefined,
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
  }
}

function toMaintenance(mw: MaintenanceWire): MaintenanceWindow {
  return {
    id: String(mw.id),
    title: mw.title,
    description: mw.description ?? '',
    startTime: new Date(mw.startTime).toISOString(),
    endTime: new Date(mw.endTime).toISOString(),
    monitors: (mw.monitors ?? []).map(String),
    active: mw.active ?? true,
    createdAt: mw.createdAt ? new Date(mw.createdAt).toISOString() : new Date().toISOString(),
  }
}

function toProxy(p: ProxyWire): ProxyConfig {
  return {
    id: String(p.id),
    name: p.name,
    protocol: p.protocol as ProxyConfig['protocol'],
    host: p.host,
    port: p.port,
    auth: p.auth ?? undefined,
  }
}

function toApiKey(k: ApiKeyWire): ApiKey {
  return {
    id: String(k.id),
    name: k.name,
    key: k.key,
    active: k.active ?? true,
    createdAt: k.createdAt ? new Date(k.createdAt).toISOString() : new Date().toISOString(),
    lastUsed: k.lastUsed ? new Date(k.lastUsed).toISOString() : undefined,
  }
}

function toGroup(g: GroupWire): MonitorGroup {
  return {
    id: String(g.id),
    name: g.name,
    monitors: (g.monitors ?? []).map(String),
  }
}

function toBackupData(d: BackupWire): BackupData {
  return {
    version: d.version ?? '1.0',
    exportedAt: d.exportedAt ?? new Date().toISOString(),
    monitors: (d.monitors ?? []).map(toMonitor),
    notifications: (d.notifications ?? []).map(toNotification),
    statusPages: (d.statusPages ?? []).map(toStatusPage),
    maintenance: (d.maintenance ?? []).map(toMaintenance),
  }
}

export const monitorsApi = {
  list(all = false) {
    return request<{ monitors: MonitorWire[] }>(`/monitoring/monitors${all ? '?all=1' : ''}`).then(r => r.monitors.map(toMonitor))
  },

  get(id: string) {
    return request<{ monitor: MonitorWire }>(`/monitoring/monitors/${id}`).then(r => toMonitor(r.monitor))
  },

  create(input: MonitorInput) {
    return request<{ monitor: MonitorWire }>('/monitoring/monitors', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => toMonitor(r.monitor))
  },

  update(id: string, input: Partial<MonitorInput>) {
    return request<{ monitor: MonitorWire }>(`/monitoring/monitors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then(r => toMonitor(r.monitor))
  },

  remove(id: string) {
    return request<{ ok: boolean }>(`/monitoring/monitors/${id}`, { method: 'DELETE' })
  },

  heartbeats(id: string, limit = 120) {
    return request<{ heartbeats: HeartbeatWire[] }>(
      `/monitoring/monitors/${id}/heartbeats?limit=${limit}`,
    ).then(r => r.heartbeats.map(toHeartbeat))
  },

  uptime(id: string, period: string) {
    return request<{ uptime: number }>(`/monitoring/monitors/${id}/uptime?period=${period}`).then(r => r.uptime)
  },

  check(id: string) {
    return request<{ result: Record<string, unknown> }>(`/monitoring/monitors/${id}/check`, { method: 'POST' }).then(r => r.result)
  },

  tags() {
    return request<{ tags: string[] }>('/monitors/tags').then(r => r.tags)
  },

  targets() {
    return request<{ targets: Array<{ targetId: number; status: string }> }>('/monitoring/targets').then(r => r.targets)
  },

  recent(limit = 20) {
    return request<{ results: Array<Record<string, unknown>> }>(`/monitoring?limit=${limit}`).then(r => r.results)
  },

  stats() {
    return request<{ stats: Record<string, number> }>('/monitoring/stats').then(r => r.stats)
  },
}

export const notificationsApi = {
  list() {
    return request<{ notifications: NotificationWire[] }>('/notifications').then(r => r.notifications.map(toNotification))
  },

  create(input: { name: string; type: string; config?: Record<string, string>; active?: boolean; applyTo?: string[]; customMessage?: string | null }) {
    return request<{ notification: NotificationWire }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => toNotification(r.notification))
  },

  update(id: string, input: Partial<{ name: string; type: string; config: Record<string, string>; active: boolean; applyTo: string[]; customMessage: string | null }>) {
    return request<{ notification: NotificationWire }>(`/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then(r => toNotification(r.notification))
  },

  remove(id: string) {
    return request<{ ok: boolean }>(`/notifications/${id}`, { method: 'DELETE' })
  },

  test(id: string) {
    return request<{ ok: boolean }>(`/notifications/${id}/test`, { method: 'POST' })
  },

  detectTelegramChatIds(botToken: string) {
    return request<{ chats: TelegramChat[] }>('/notifications/telegram/detect-chat-id', {
      method: 'POST',
      body: JSON.stringify({ botToken }),
    }).then(r => r.chats)
  },
}

export interface TelegramChat {
  id: number
  type: string
  title: string | null
  username: string | null
}

export interface StatusPageInput {
  title: string
  slug: string
  active?: boolean
  monitors?: string[]
  customDomain?: string | null
  theme?: string
  description?: string | null
  showUptime?: boolean
  showHistory?: boolean
}

export const statusPagesApi = {
  list() {
    return request<{ statusPages: StatusPageWire[] }>('/status-pages').then(r => r.statusPages.map(toStatusPage))
  },

  get(id: string) {
    return request<{ statusPage: StatusPageWire }>(`/status-pages/${id}`).then(r => toStatusPage(r.statusPage))
  },

  create(input: StatusPageInput) {
    return request<{ statusPage: StatusPageWire }>('/status-pages', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => toStatusPage(r.statusPage))
  },

  update(id: string, input: Partial<StatusPageInput>) {
    return request<{ statusPage: StatusPageWire }>(`/status-pages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then(r => toStatusPage(r.statusPage))
  },

  remove(id: string) {
    return request<{ ok: boolean }>(`/status-pages/${id}`, { method: 'DELETE' })
  },

  publicBySlug(slug: string) {
    return request<{
      statusPage: StatusPageWire
      monitors: MonitorWire[]
      heartbeats: Record<string, HeartbeatWire[]>
      uptimes: Record<string, Record<string, number>>
    }>(`/status-pages/public/${slug}`).then(r => ({
      statusPage: toStatusPage(r.statusPage),
      monitors: r.monitors.map(toMonitor),
      heartbeats: Object.fromEntries(
        Object.entries(r.heartbeats).map(([k, v]) => [k, v.map(toHeartbeat)]),
      ),
      uptimes: r.uptimes ?? {},
    }))
  },
}

export const maintenanceApi = {
  list() {
    return request<{ maintenance: MaintenanceWire[] }>('/maintenance').then(r => r.maintenance.map(toMaintenance))
  },

  create(input: { title: string; description?: string; startTime: string; endTime: string; monitors?: string[]; active?: boolean }) {
    return request<{ maintenance: MaintenanceWire }>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => toMaintenance(r.maintenance))
  },

  update(id: string, input: Partial<{ title: string; description: string; startTime: string; endTime: string; monitors: string[]; active: boolean }>) {
    return request<{ maintenance: MaintenanceWire }>(`/maintenance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then(r => toMaintenance(r.maintenance))
  },

  remove(id: string) {
    return request<{ ok: boolean }>(`/maintenance/${id}`, { method: 'DELETE' })
  },
}

export const proxiesApi = {
  list() {
    return request<{ proxies: ProxyWire[] }>('/proxies').then(r => r.proxies.map(toProxy))
  },

  create(input: { name: string; protocol: string; host: string; port: number; auth?: { username: string; password: string } }) {
    return request<{ proxy: ProxyWire }>('/proxies', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => toProxy(r.proxy))
  },

  update(id: string, input: Partial<{ name: string; protocol: string; host: string; port: number; auth: { username: string; password: string } }>) {
    return request<{ proxy: ProxyWire }>(`/proxies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then(r => toProxy(r.proxy))
  },

  remove(id: string) {
    return request<{ ok: boolean }>(`/proxies/${id}`, { method: 'DELETE' })
  },

  test(id: string) {
    return request<{ ok: boolean; latency: number; error?: string }>(`/proxies/${id}/test`, { method: 'POST' })
  },
}

export const apiKeysApi = {
  list() {
    return request<{ apiKeys: ApiKeyWire[] }>('/api-keys').then(r => r.apiKeys.map(toApiKey))
  },

  create(input: { name: string; active?: boolean }) {
    return request<{ apiKey: ApiKeyWire }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => toApiKey(r.apiKey))
  },

  update(id: string, input: Partial<{ name: string; active: boolean }>) {
    return request<{ apiKey: ApiKeyWire }>(`/api-keys/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then(r => toApiKey(r.apiKey))
  },

  remove(id: string) {
    return request<{ ok: boolean }>(`/api-keys/${id}`, { method: 'DELETE' })
  },
}

export const groupsApi = {
  list() {
    return request<{ groups: GroupWire[] }>('/groups').then(r => r.groups.map(toGroup))
  },

  create(input: { name: string; monitors?: string[] }) {
    return request<{ group: GroupWire }>('/groups', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => toGroup(r.group))
  },

  update(id: string, input: Partial<{ name: string; monitors: string[] }>) {
    return request<{ group: GroupWire }>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then(r => toGroup(r.group))
  },

  remove(id: string) {
    return request<{ ok: boolean }>(`/groups/${id}`, { method: 'DELETE' })
  },
}

export const backupApi = {
  export() {
    return request<BackupWire>('/backup/export').then(toBackupData)
  },

  import(data: unknown) {
    return request<{ ok?: boolean }>('/backup/import', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

export const badgeApi = {
  url(id: string, opts: { label?: string; color?: string; style?: string } = {}) {
    const qs = new URLSearchParams()
    if (opts.label) qs.set('label', opts.label)
    if (opts.color) qs.set('color', opts.color)
    if (opts.style) qs.set('style', opts.style)
    const q = qs.toString()
    return `${getWorkerUrl()}/badge/${id}${q ? `?${q}` : ''}`
  },
}

export const metricsUrl = `${getWorkerUrl()}/metrics`
