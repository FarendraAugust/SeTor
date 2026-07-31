import { env } from '../../config/env.js'
import { TargetRepository } from '../target/target.repository.js'
import { MonitorRepository } from './monitor.repository.js'
import { bus } from '../bus/bus.service.js'
import { HttpError } from '../../common/errors/http-error.js'
import { runCheck, type CheckResult } from './monitor.checkers.js'
import { NotificationService } from '../notification/notification.service.js'
import type { Target, Monitor, MonitorType, MonitorStatus, Heartbeat, Certificate } from '../target/target.types.js'

const UPTIME_PERIODS: Record<string, number> = {
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
  '90d': 90 * 24 * 3600 * 1000,
}

type CertCacheEntry = { cert: Certificate; fetchedAt: number }

const certCache = new Map<number, CertCacheEntry>()
const lastStatus = new Map<number, string>()
const lastNotifyAt = new Map<number, number>()
const suppressedNotify = new Map<number, boolean>()

async function fetchCertificate(targetId: number, host: string, port: number) {
  try {
    const proc = Bun.spawn(['openssl', 's_client', '-connect', `${host}:${port}`, '-servername', host, '-showcerts'], {
      stdout: 'pipe',
      stderr: 'ignore',
      stdin: 'pipe',
    })
    proc.stdin?.end()
    const code = await Promise.race([
      proc.exited,
      new Promise<number>((resolve) => setTimeout(() => { try { proc.kill() } catch {} ; resolve(1) }, 8000)),
    ])
    const out = proc.stdout?.toString() ?? ''
    const issuer = out.match(/issuer=([^\n]+)/)?.[1]?.replace(/^\/CN=/i, '').trim() ?? 'Unknown'
    const notBefore = out.match(/notBefore=([^\n]+)/)?.[1]?.trim()
    const notAfter = out.match(/notAfter=([^\n]+)/)?.[1]?.trim()
    if (!notAfter || code !== 0) return

    const toDate = (s: string) => new Date(s).toISOString()
    const daysRemaining = Math.floor((new Date(notAfter).getTime() - Date.now()) / 86400000)
    const cert: Certificate = {
      issuer,
      validFrom: toDate(notBefore ?? notAfter),
      validTo: toDate(notAfter),
      daysRemaining: Math.max(0, daysRemaining),
    }
    certCache.set(targetId, { cert, fetchedAt: Date.now() })
  } catch {
    // ignore certificate fetch errors
  }
}

function getCertificate(target: Target): Certificate | undefined {
  const type = target.type as MonitorType
  if (type !== 'http' && type !== 'keyword' && type !== 'websocket') return undefined
  let host: string
  let port = 443
  try {
    const u = new URL(target.url)
    host = u.hostname
    port = u.port ? Number(u.port) : 443
  } catch {
    return undefined
  }

  const cached = certCache.get(target.id)
  if (cached && Date.now() - cached.fetchedAt < 6 * 3600 * 1000) return cached.cert

  void fetchCertificate(target.id, host, port)
  return undefined
}

export const MonitorService = {
  async checkTarget(target: Target) {
    const started = performance.now()
    const checkedAt = new Date()

    let result: CheckResult
    try {
      result = await runCheck(target, checkedAt)
    } catch (e: any) {
      result = {
        status: 'down',
        responseTime: Math.round((performance.now() - started) * 100) / 100,
        statusCode: null,
        ping: null,
        error: e.message ?? 'check failed',
      }
    }

    const status = result.status as MonitorStatus
    const prev = lastStatus.get(target.id)

    if (target.type === 'push') {
      await MonitorRepository.insert({
        targetId: target.id,
        targetName: target.name,
        status,
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        ping: result.ping,
        error: result.error,
        checkedAt,
        workerId: env.workerId,
      })
    } else if (status !== prev || !prev) {
      await MonitorRepository.insert({
        targetId: target.id,
        targetName: target.name,
        status,
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        ping: result.ping,
        error: result.error,
        checkedAt,
        workerId: env.workerId,
      })
    }

    lastStatus.set(target.id, status)

    const busEvent = {
      targetId: target.id,
      targetName: target.name,
      status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      error: result.error,
      checkedAt,
    }

    await bus.emit('monitoring', 'monitoring.result', busEvent)

    if (status !== 'pending' && (prev === undefined || status !== prev)) {
      const now = Date.now()
      const last = lastNotifyAt.get(target.id) ?? 0
      const intervalOk = now - last >= (target.notificationInterval ?? 60) * 1000 || target.resendNotification
      const threshold = target.notificationThreshold
      const wasSuppressed = suppressedNotify.get(target.id) ?? false
      const belowThreshold = status === 'down' && threshold != null && result.responseTime < threshold

      if (belowThreshold) {
        suppressedNotify.set(target.id, true)
      } else {
        suppressedNotify.set(target.id, false)
        if (intervalOk && !(status === 'up' && wasSuppressed)) {
          lastNotifyAt.set(target.id, now)
          void NotificationService.dispatch({
            target,
            status,
            responseTime: result.responseTime,
            error: result.error,
            checkedAt,
          })
        }
      }
    }

    return busEvent
  },

  async runLoop() {
    const targets = await TargetRepository.findEnabled()
    await Promise.all(targets.map((t) => this.checkTarget(t)))
  },

  start() {
    const interval = env.checkInterval * 1000
    this.runLoop().then(() => {
      setInterval(() => this.runLoop(), interval)
    })
  },

  recent(limit?: number) {
    return MonitorRepository.recent(limit)
  },

  stats() {
    return MonitorRepository.stats()
  },

  targets() {
    return MonitorRepository.latestByTarget()
  },

  timeline(targetId: number, limit?: number) {
    return MonitorRepository.timeline(targetId, limit)
  },

  async uptime(targetId: number, period: string): Promise<number> {
    const ms = UPTIME_PERIODS[period]
    if (!ms) throw HttpError.badRequest(`invalid period, must be one of: ${Object.keys(UPTIME_PERIODS).join(', ')}`)
    const since = new Date(Date.now() - ms)
    const { total, up } = await MonitorRepository.uptimeSince(targetId, since)
    return total === 0 ? 0 : Math.round((up / total) * 1000) / 10
  },

  async monitors(includeAll = false): Promise<Monitor[]> {
    const targets = includeAll ? await TargetRepository.findAll() : await TargetRepository.findEnabled()
    const stats = await MonitorRepository.perTargetStats()
    const statMap = new Map(stats.map((s) => [s.targetId, s]))
    const monitors: Monitor[] = []

    for (const t of targets) {
      monitors.push(await this.toMonitor(t, statMap.get(t.id)))
    }

    return monitors
  },

  async monitorById(id: number): Promise<Monitor> {
    const target = await TargetRepository.findById(id)
    if (!target) throw HttpError.notFound('monitor not found')
    const stats = await MonitorRepository.perTargetStats()
    return this.toMonitor(target, stats.find((s) => s.targetId === id))
  },

  async heartbeats(targetId: number, limit = 120): Promise<Heartbeat[]> {
    await this.monitorById(targetId)
    const rows = await MonitorRepository.timeline(targetId, Math.min(limit, 500))
    return rows.map((r) => ({
      time: r.checkedAt.toISOString(),
      status: (r.status as MonitorStatus) || 'unknown',
      responseTime: r.responseTime ?? 0,
      message: r.error ?? undefined,
      ping: r.ping ?? undefined,
    }))
  },

  async allTags(): Promise<string[]> {
    const targets = await TargetRepository.findAll()
    const tags = new Set<string>()
    for (const t of targets) for (const tag of t.tags ?? []) tags.add(tag)
    return Array.from(tags).sort()
  },

  async toMonitor(
    t: Target,
    s?: { status: string; uptime: number; responseTime: number | null; lastCheckedAt: Date },
  ): Promise<Monitor> {
    const cert = await getCertificate(t)
    const lastChecked = s?.lastCheckedAt && s.lastCheckedAt.getTime() > 0 ? s.lastCheckedAt.toISOString() : new Date(0).toISOString()
    return {
      id: String(t.id),
      name: t.name,
      url: t.url,
      type: (t.type as MonitorType) ?? 'http',
      status: (s?.status as MonitorStatus) ?? 'pending',
      uptime: s?.uptime ?? 0,
      responseTime: Math.round(s?.responseTime ?? 0),
      interval: t.interval,
      timeout: t.timeout,
      retries: t.retries,
      tags: t.tags ?? [],
      active: t.enabled,
      createdAt: t.createdAt.toISOString(),
      lastChecked,
      certificate: cert,
      notificationIds: t.notificationIds ?? [],
      description: t.description ?? undefined,
      dockerContainer: t.dockerContainer ?? undefined,
      pushToken: t.pushToken ?? undefined,
      steamGameId: t.steamGameId ?? undefined,
      jsonQuery: t.jsonQuery ?? undefined,
      expectedValue: t.expectedValue ?? undefined,
      proxyId: t.proxyId ?? undefined,
      upsideDown: t.upsideDown,
      maxredirects: t.maxRedirects,
      ignoreTls: t.ignoreTls,
      resendNotification: t.resendNotification,
      notificationInterval: t.notificationInterval ?? undefined,
      notificationThreshold: t.notificationThreshold ?? undefined,
    }
  },
} as const
