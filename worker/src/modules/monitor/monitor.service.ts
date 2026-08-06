import { env } from '../../config/env.js'
import { TargetRepository } from '../target/target.repository.js'
import { MonitorRepository } from './monitor.repository.js'
import { bus } from '../bus/bus.service.js'
import { HttpError } from '../../common/errors/http-error.js'
import { runCheck, type CheckResult } from './monitor.checkers.js'
import { LeaderService } from '../leader/leader.service.js'
import { AnalysisService } from '../analysis/analysis.service.js'
import { SyncService } from '../internal/sync.service.js'
import type { Target, Monitor, MonitorType, MonitorStatus, Heartbeat, Certificate } from '../target/target.types.js'

const UPTIME_PERIODS: Record<string, number> = {
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
  '90d': 90 * 24 * 3600 * 1000,
}

type CertCacheEntry = { cert: Certificate; fetchedAt: number }

const certCache = new Map<number, CertCacheEntry>()
let monitorStarted = false

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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
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

    // Retry sebelum menyatakan down (Kuma behavior: retries kali sebelum down)
    const retries = target.retries ?? 0
    if (result.status === 'down' && retries > 0 && target.type !== 'push') {
      for (let i = 0; i < retries; i++) {
        await sleep(500)
        result = await runCheck(target, checkedAt)
        if (result.status === 'up') break
      }
    }

    const status = result.status as MonitorStatus

    // Simpan SETIAP hasil check (basis uptime & konsensus yang akurat)
    const row = await MonitorRepository.insert({
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

    // Leader: proses konsensus langsung (dari hasil sendiri)
    if (LeaderService.isLeader()) {
      void AnalysisService.onResults([row])
    }

    return busEvent
  },

  async runLoop() {
    const targets = await TargetRepository.findEnabled()
    // allSettled: satu target error tidak boleh menghentikan target lain
    await Promise.allSettled(targets.map((t) => this.checkTarget(t)))

    // Follower: kirim hasil baru ke leader
    if (!LeaderService.isLeader()) {
      void SyncService.pushResults()
    }

    // Prune retention (periodik — setiap 10x interval)
    if (Math.floor(Date.now() / (env.checkInterval * 10_000)) % 10 === 0) {
      const cutoff = new Date(Date.now() - env.retentionDays * 24 * 3600 * 1000)
      void MonitorRepository.prune(cutoff)
    }
  },

  start() {
    if (monitorStarted) return
    monitorStarted = true
    const interval = env.checkInterval * 1000
    // Jitter antar node agar tidak thundering herd ke target yang sama (hanya di cluster)
    const hasPeers = LeaderService.peers().length > 0
    const jitterMs = hasPeers ? hashWorkerId() % interval : 0
    setTimeout(() => {
      this.runLoop().then(() => {
        setInterval(() => this.runLoop().catch((e: any) => console.error('[monitor] loop error:', e?.message)), interval)
      }).catch((e: any) => console.error('[monitor] first loop error:', e?.message))
    }, jitterMs)
  },

  recent(limit?: number) {
    return MonitorRepository.recent(limit)
  },

  async stats() {
    if (LeaderService.isLeader()) {
      const s = await AnalysisService.stats()
      return {
        total: s.total,
        up: s.up,
        down: s.down,
        avgResponseTime: s.avgResponseTime,
        uptime: s.total === 0 ? 0 : Math.round((s.up / s.total) * 100),
        lastCheckedAt: s.lastCheckedAt,
      }
    }
    return MonitorRepository.stats()
  },

  async targets() {
    if (LeaderService.isLeader()) {
      const states = await AnalysisService.perTargetStats()
      return states.map((s) => ({
        targetId: s.targetId,
        targetName: String(s.targetId),
        status: s.status,
        responseTime: s.responseTime,
        statusCode: null,
        lastCheckedAt: s.lastCheckedAt,
      }))
    }
    return MonitorRepository.latestByTarget()
  },

  timeline(targetId: number, limit?: number) {
    return MonitorRepository.timeline(targetId, limit)
  },

  async uptime(targetId: number, period: string): Promise<number> {
    if (LeaderService.isLeader()) {
      return AnalysisService.uptime(targetId, period)
    }
    const ms = UPTIME_PERIODS[period]
    if (!ms) throw HttpError.badRequest(`invalid period, must be one of: ${Object.keys(UPTIME_PERIODS).join(', ')}`)
    const since = new Date(Date.now() - ms)
    const { total, up } = await MonitorRepository.uptimeSince(targetId, since)
    return total === 0 ? 0 : Math.round((up / total) * 1000) / 10
  },

  async monitors(includeAll = false): Promise<Monitor[]> {
    const targets = includeAll ? await TargetRepository.findAll() : await TargetRepository.findEnabled()
    const stats = LeaderService.isLeader()
      ? await AnalysisService.perTargetStats()
      : await MonitorRepository.perTargetStats()
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
    const stats = LeaderService.isLeader()
      ? await AnalysisService.perTargetStats()
      : await MonitorRepository.perTargetStats()
    return this.toMonitor(target, stats.find((s) => s.targetId === id))
  },

  async heartbeats(targetId: number, limit = 120): Promise<Heartbeat[]> {
    await this.monitorById(targetId)
    const capped = Math.min(limit, 500)
    const rows = LeaderService.isLeader()
      ? await AnalysisService.timeline(targetId, capped)
      : await MonitorRepository.timeline(targetId, capped)
    return rows.map((r) => ({
      time: r.checkedAt.toISOString(),
      status: (r.status as MonitorStatus) || 'unknown',
      responseTime: r.responseTime ?? 0,
      message: 'status' in r && r.status === 'degraded' ? 'no majority vote across workers' : undefined,
      ping: undefined,
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

function hashWorkerId(): number {
  let h = 0
  for (let i = 0; i < env.workerId.length; i++) {
    h = (h * 31 + env.workerId.charCodeAt(i)) >>> 0
  }
  return h
}
