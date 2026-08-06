import { desc, sql, eq, and, gte, gt, lt } from 'drizzle-orm'
import { dbLocal } from '../../database/local.js'
import { monitoring } from './monitor.schema.js'
import type { Monitoring, NewMonitoring, MonitorStats, TargetStatus } from './monitor.types.js'

export const MonitorRepository = {
  async insert(data: NewMonitoring): Promise<Monitoring> {
    try {
      const [row] = await dbLocal.insert(monitoring).values(data).returning()
      return row
    } catch (e: any) {
      console.error('[monitor] insert failed:', JSON.stringify({ ...(data as object), id: (data as any).id ?? 'auto' }), e?.message)
      throw e
    }
  },

  /** Insert batch hasil (dari worker sendiri atau push worker lain) — dedup aman. */
  insertMany(data: NewMonitoring[]): Promise<void> {
    if (data.length === 0) return Promise.resolve()
    return dbLocal.insert(monitoring).values(data).onConflictDoNothing()
      .then(() => {})
      .catch((e: any) => {
        console.error(`[monitor] insertMany failed (${data.length} rows, has id: ${data.some((d) => (d as any).id != null)})`, e?.message)
        throw e
      })
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

  /** Hasil monitoring milik worker ini setelah timestamp tertentu (untuk push ke leader). */
  rowsSince(since: Date, workerId: string, limit = 2000): Promise<Monitoring[]> {
    return dbLocal.select().from(monitoring)
      .where(and(eq(monitoring.workerId, workerId), gt(monitoring.checkedAt, since)))
      .orderBy(monitoring.checkedAt)
      .limit(limit)
  },

  removeByTarget(targetId: number): Promise<void> {
    return dbLocal.delete(monitoring).where(eq(monitoring.targetId, targetId)).then(() => {})
  },

  /** Prune hasil lama (retention). */
  prune(olderThan: Date): Promise<void> {
    return dbLocal.delete(monitoring).where(lt(monitoring.checkedAt, olderThan)).then(() => {})
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
