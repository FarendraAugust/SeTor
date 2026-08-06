import { desc, eq, sql } from 'drizzle-orm'
import { dbLocal } from '../../database/local.js'
import { WorkerService } from '../leader/worker.service.js'
import { TargetService } from '../target/target.service.js'
import { MonitorService } from '../monitor/monitor.service.js'
import { AnalysisService } from '../analysis/analysis.service.js'
import { monitoring } from '../monitor/monitor.schema.js'

async function perWorkerStats() {
  const rows = await dbLocal.select({
    workerId: monitoring.workerId,
    total: sql<number>`count(*)::int`,
    up: sql<number>`count(*) FILTER (WHERE status = 'up')::int`,
    down: sql<number>`count(*) FILTER (WHERE status = 'down')::int`,
    avgResponseTime: sql<number | null>`avg(response_time) FILTER (WHERE status = 'up')`,
  }).from(monitoring).groupBy(monitoring.workerId)

  return rows.map((r) => ({
    workerId: r.workerId,
    total: r.total,
    up: r.up,
    down: r.down,
    avgResponseTime: r.avgResponseTime != null ? Math.round(r.avgResponseTime) : null,
  }))
}

async function perWorkerLatestTargets() {
  const rows = await dbLocal.select()
    .from(monitoring)
    .orderBy(desc(monitoring.checkedAt))
  const map = new Map<string, Map<number, { status: string; lastCheckedAt: Date }>>()
  for (const r of rows) {
    const byTarget = map.get(r.workerId) ?? new Map()
    if (!byTarget.has(r.targetId)) {
      byTarget.set(r.targetId, { status: r.status, lastCheckedAt: r.checkedAt })
    }
    map.set(r.workerId, byTarget)
  }
  const out: Record<string, Array<{ targetId: number; status: string; lastCheckedAt: string }>> = {}
  for (const [wid, targets] of map) {
    out[wid] = [...targets.entries()].map(([targetId, v]) => ({
      targetId,
      status: v.status,
      lastCheckedAt: v.lastCheckedAt.toISOString(),
    }))
  }
  return out
}

export const DashboardService = {
  async overview() {
    const me = await WorkerService.me()
    const [workers, targets, stats, workerStats, workerTargets] = await Promise.all([
      WorkerService.list(),
      TargetService.list(),
      MonitorService.stats(),
      perWorkerStats(),
      perWorkerLatestTargets(),
    ])

    const workersData: Record<string, { stats: unknown; targets: unknown[] }> = {}
    for (const ws of workerStats) {
      workersData[ws.workerId] = { stats: ws, targets: workerTargets[ws.workerId] ?? [] }
    }
    if (!workersData[me.id]) {
      workersData[me.id] = { stats: null, targets: [] }
    }

    return { me, workers, targets, workersData, stats }
  },

  async health() {
    const [workers, targets, stats] = await Promise.all([
      WorkerService.list(),
      TargetService.list(),
      AnalysisService.stats(),
    ])

    const totalTargets = targets.filter((t) => t.enabled).length

    return {
      workers: { total: workers.length, online: workers.filter((w) => w.isOnline).length },
      targets: { total: totalTargets, up: stats.up, down: stats.down, degraded: stats.degraded },
      uptime: stats.total === 0 ? 0 : Math.round((stats.up / stats.total) * 100),
    }
  },
} as const
