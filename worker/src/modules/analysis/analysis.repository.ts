import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { dbLocal } from '../../database/local.js'
import { monitorState, analysis, incidents, alertState } from './analysis.schema.js'

type WorkerLatest = { workerId: string; status: string; responseTime: number | null; checkedAt: Date }

export const AnalysisRepository = {
  latestPerWorker(targetId: number, since: Date): Promise<WorkerLatest[]> {
    return dbLocal.execute<WorkerLatest>(
      sql`SELECT DISTINCT ON (worker_id) worker_id AS "workerId", status, response_time AS "responseTime", checked_at AS "checkedAt"
          FROM monitoring WHERE target_id = ${targetId} AND checked_at >= ${since.toISOString()}
          ORDER BY worker_id, checked_at DESC`,
    ).then((r) => (r as unknown as WorkerLatest[]).map((x) => ({ ...x, checkedAt: new Date(x.checkedAt) })))
  },

  upsertMonitorState(row: {
    targetId: number
    status: string
    votes: Record<string, string>
    responseTime: number | null
    lastCheckedAt: Date
    inMaintenance: boolean
  }) {
    return dbLocal.insert(monitorState).values(row).onConflictDoUpdate({
      target: monitorState.targetId,
      set: {
        status: row.status,
        votes: row.votes,
        responseTime: row.responseTime,
        lastCheckedAt: row.lastCheckedAt,
        inMaintenance: row.inMaintenance,
        updatedAt: new Date(),
      },
    })
  },

  getMonitorState(targetId: number): Promise<typeof monitorState.$inferSelect | undefined> {
    return dbLocal.select().from(monitorState).where(eq(monitorState.targetId, targetId)).then((r) => r[0])
  },

  allMonitorStates(): Promise<Array<typeof monitorState.$inferSelect>> {
    return dbLocal.select().from(monitorState)
  },

  upsertAnalysis(row: {
    targetId: number
    checkedAt: Date
    status: string
    responseTime: number | null
    degraded: boolean
    votes: Record<string, string>
  }) {
    return dbLocal.insert(analysis).values(row).onConflictDoUpdate({
      target: [analysis.targetId, analysis.checkedAt],
      set: { status: row.status, responseTime: row.responseTime, degraded: row.degraded, votes: row.votes },
    })
  },

  analysisTimeline(targetId: number, limit = 120): Promise<Array<typeof analysis.$inferSelect>> {
    return dbLocal.select().from(analysis)
      .where(eq(analysis.targetId, targetId))
      .orderBy(desc(analysis.checkedAt))
      .limit(limit)
  },

  analysisSince(targetId: number, since: Date): Promise<Array<typeof analysis.$inferSelect>> {
    return dbLocal.select().from(analysis)
      .where(and(eq(analysis.targetId, targetId), gte(analysis.checkedAt, since)))
      .orderBy(desc(analysis.checkedAt))
  },

  analysisStats(since: Date): Promise<{ total: number; up: number; down: number; degraded: number; avgResponseTime: number | null; lastCheckedAt: Date | null }> {
    return dbLocal.execute<Record<string, unknown>>(
      sql`SELECT
            count(*)::int AS total,
            count(*) FILTER (WHERE status = 'up')::int AS up,
            count(*) FILTER (WHERE status = 'down')::int AS down,
            count(*) FILTER (WHERE status = 'degraded')::int AS degraded,
            avg(response_time) FILTER (WHERE status = 'up') AS "avgResponseTime",
            max(checked_at) AS "lastCheckedAt"
          FROM analysis WHERE checked_at >= ${since.toISOString()}`,
    ).then((r) => {
      const row = (r as unknown as Array<Record<string, unknown>>)[0] ?? {}
      return {
        total: Number(row.total ?? 0),
        up: Number(row.up ?? 0),
        down: Number(row.down ?? 0),
        degraded: Number(row.degraded ?? 0),
        avgResponseTime: row.avgResponseTime != null ? Math.round(Number(row.avgResponseTime)) : null,
        lastCheckedAt: row.lastCheckedAt ? new Date(String(row.lastCheckedAt)) : null,
      }
    })
  },

  upsertAlertState(row: { targetId: number; lastStatus: string; lastNotifiedAt: Date | null; downCount: number }) {
    return dbLocal.insert(alertState).values(row).onConflictDoUpdate({
      target: alertState.targetId,
      set: {
        lastStatus: row.lastStatus,
        lastNotifiedAt: row.lastNotifiedAt,
        downCount: row.downCount,
        updatedAt: new Date(),
      },
    })
  },

  getAlertState(targetId: number): Promise<typeof alertState.$inferSelect | undefined> {
    return dbLocal.select().from(alertState).where(eq(alertState.targetId, targetId)).then((r) => r[0])
  },

  openIncident(targetId: number): Promise<typeof incidents.$inferSelect | undefined> {
    return dbLocal.select().from(incidents)
      .where(and(eq(incidents.targetId, targetId), eq(incidents.resolved, false)))
      .orderBy(desc(incidents.startedAt))
      .limit(1)
      .then((r) => r[0])
  },

  insertIncident(row: { targetId: number; targetName: string; status: string; startedAt: Date }) {
    return dbLocal.insert(incidents).values(row)
  },

  closeIncident(inc: { id: number; startedAt: Date }, endedAt: Date) {
    const durationMs = endedAt.getTime() - inc.startedAt.getTime()
    return dbLocal.update(incidents)
      .set({ endedAt, resolved: true, durationMs })
      .where(eq(incidents.id, inc.id))
  },

  listIncidents(limit = 50): Promise<Array<typeof incidents.$inferSelect>> {
    return dbLocal.select().from(incidents).orderBy(desc(incidents.startedAt)).limit(limit)
  },

  prune(olderThan: Date): Promise<void> {
    return dbLocal.delete(analysis).where(lt(analysis.checkedAt, olderThan)).then(() => {})
  },
}
