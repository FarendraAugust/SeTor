import { desc, sql, eq, and, gte } from 'drizzle-orm'
import { dbLocal } from '../../database/local.js'
import { monitoring } from './monitor.schema.js'
import type { Monitoring, NewMonitoring, MonitorStats, TargetStatus } from './monitor.types.js'

export const MonitorRepository = {
  insert(data: NewMonitoring): Promise<void> {
    return dbLocal.insert(monitoring).values(data).then(() => {})
  },

  recent(limit = 50): Promise<Monitoring[]> {
    return dbLocal.select().from(monitoring).orderBy(desc(monitoring.checkedAt)).limit(limit)
  },

  count(): Promise<number> {
    return dbLocal.select({ count: sql<number>`count(*)` }).from(monitoring).then((r) => r[0]?.count ?? 0)
  },

  async stats(): Promise<MonitorStats> {
    const [total] = await dbLocal.select({ count: sql<number>`count(*)::int` }).from(monitoring)
    const [up] = await dbLocal.select({ count: sql<number>`count(*)::int` })
      .from(monitoring)
      .where(eq(monitoring.status, 'up'))
    const [avg] = await dbLocal.select({ avg: sql<number | null>`avg(response_time)` })
      .from(monitoring)
      .where(eq(monitoring.status, 'up'))
    const [last] = await dbLocal.select({ checkedAt: monitoring.checkedAt })
      .from(monitoring)
      .orderBy(desc(monitoring.checkedAt))
      .limit(1)

    const totalCount = total?.count ?? 0
    const upCount = up?.count ?? 0

    return {
      total: totalCount,
      up: upCount,
      down: totalCount - upCount,
      avgResponseTime: avg?.avg ?? null,
      uptime: totalCount === 0 ? 0 : Math.round((upCount / totalCount) * 100),
      lastCheckedAt: last?.checkedAt ?? null,
    }
  },

  async latestByTarget(): Promise<TargetStatus[]> {
    const rows = await dbLocal.select().from(monitoring).orderBy(desc(monitoring.checkedAt))
    const map = new Map<number, TargetStatus>()
    for (const r of rows) {
      if (!map.has(r.targetId)) {
        map.set(r.targetId, {
          targetId: r.targetId,
          targetName: r.targetName,
          status: r.status,
          responseTime: r.responseTime,
          statusCode: r.statusCode,
          lastCheckedAt: r.checkedAt,
        })
      }
    }
    return [...map.values()]
  },

  timeline(targetId: number, limit = 100): Promise<Monitoring[]> {
    return dbLocal.select()
      .from(monitoring)
      .where(eq(monitoring.targetId, targetId))
      .orderBy(desc(monitoring.checkedAt))
      .limit(limit)
  },

  latestByTargetId(targetId: number): Promise<Monitoring | undefined> {
    return dbLocal.select()
      .from(monitoring)
      .where(eq(monitoring.targetId, targetId))
      .orderBy(desc(monitoring.checkedAt))
      .limit(1)
      .then((r) => r[0])
  },

  uptimeSince(targetId: number, since: Date): Promise<{ total: number; up: number }> {
    return dbLocal.select({
      total: sql<number>`count(*)::int`,
      up: sql<number>`count(*) FILTER (WHERE status = 'up')::int`,
    }).from(monitoring)
      .where(and(eq(monitoring.targetId, targetId), gte(monitoring.checkedAt, since)))
      .then((r) => ({ total: r[0]?.total ?? 0, up: r[0]?.up ?? 0 }))
  },

  removeByTarget(targetId: number): Promise<void> {
    return dbLocal.delete(monitoring).where(eq(monitoring.targetId, targetId)).then(() => {})
  },

  async perTargetStats(): Promise<Array<{
    targetId: number
    status: string
    uptime: number
    responseTime: number | null
    lastCheckedAt: Date
  }>> {
    const [latest, grouped] = await Promise.all([
      dbLocal.select().from(monitoring).orderBy(desc(monitoring.checkedAt)),
      dbLocal.select({
        targetId: monitoring.targetId,
        total: sql<number>`count(*)::int`,
        up: sql<number>`count(*) FILTER (WHERE status = 'up')::int`,
      }).from(monitoring).groupBy(monitoring.targetId),
    ])

    const latestMap = new Map<number, Monitoring>()
    for (const r of latest) {
      if (!latestMap.has(r.targetId)) latestMap.set(r.targetId, r)
    }

    return grouped.map((g) => {
      const l = latestMap.get(g.targetId)
      return {
        targetId: g.targetId,
        status: l?.status ?? 'unknown',
        uptime: g.total === 0 ? 0 : Math.round((g.up / g.total) * 1000) / 10,
        responseTime: l?.responseTime ?? null,
        lastCheckedAt: l?.checkedAt ?? new Date(0),
      }
    })
  },
} as const
