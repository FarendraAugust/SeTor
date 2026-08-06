import { Hono } from 'hono'
import { env } from '../../config/env.js'
import { LeaderService } from '../leader/leader.service.js'
import { ReplicationService } from '../replication/replication.service.js'
import { MonitorRepository } from '../monitor/monitor.repository.js'
import { AnalysisService } from '../analysis/analysis.service.js'
import type { NewMonitoring } from '../monitor/monitor.types.js'

const router = new Hono()

function internalAuth(c: { req: { header: (n: string) => string | undefined; query: (n: string) => string | undefined } }): boolean {
  const header = c.req.header('x-internal-token')
  const query = c.req.query('token')
  return (header ?? query) === env.internalToken
}

function guarded(handler: (c: any) => Promise<Response> | Response) {
  return async (c: any) => {
    if (!internalAuth(c)) return c.json({ error: 'unauthorized' }, 401)
    return handler(c)
  }
}

router.get('/heartbeat', guarded(async (c) => {
  const info = {
    workerId: c.req.query('workerId') ?? '',
    publicUrl: c.req.query('publicUrl') ?? '',
    term: Number(c.req.query('term') ?? 0),
    isLeader: c.req.query('isLeader') === 'true',
    leaderId: c.req.query('leaderId') ?? '',
  }
  return c.json(await LeaderService.handleHeartbeat(info))
}))

router.post('/vote', guarded(async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return c.json(await LeaderService.handleVote(body))
}))

router.get('/leader', guarded(async (c) => {
  return c.json({
    leaderId: LeaderService.leaderId(),
    publicUrl: LeaderService.leaderPublicUrl(),
    term: LeaderService.currentTerm(),
    isLeader: LeaderService.isLeader(),
  })
}))

router.get('/health', guarded(async (c) => {
  return c.json({
    workerId: env.workerId,
    publicUrl: env.publicUrl,
    isLeader: LeaderService.isLeader(),
    term: LeaderService.currentTerm(),
    leaderId: LeaderService.leaderId(),
  })
}))

router.post('/sync/results', guarded(async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const rawRows = Array.isArray(body.rows) ? body.rows as Array<Record<string, unknown>> : []
  if (rawRows.length === 0) return c.json({ ackedAt: null })

  // rows datang via JSON → timestamp berupa string, konversi ke Date.
  // `id` DIBUANG: id lintas node bisa bentrok & PG tidak meredam duplikat intra-batch;
  // dedup dijamin unique index (target_id, checked_at, worker_id).
  const rows = rawRows.map((r) => {
    const { id: _id, ...rest } = r
    return { ...rest, checkedAt: new Date(String(r.checkedAt)) }
  }) as NewMonitoring[]

  // insert per batch besar bisa error sebagian (id bentrok antar node) → jangan membunuh proses
  let maxCheckedAt: Date | null = null
  for (const r of rows) {
    if (r.checkedAt && (!maxCheckedAt || r.checkedAt > maxCheckedAt)) maxCheckedAt = r.checkedAt
  }
  try {
    await MonitorRepository.insertMany(rows)
  } catch (e: any) {
    console.error('[internal] sync/results insert failed:', e?.message)
    return c.json({ ackedAt: null, error: 'insert failed' })
  }
  // proses konsensus (fire-and-forget, tidak memblokir follower)
  void AnalysisService.onResults(rows as never).catch((e: any) => console.error('[internal] consensus failed:', e?.message))
  return c.json({ ackedAt: maxCheckedAt ? maxCheckedAt.toISOString() : null, received: rows.length })
}))

router.get('/results', guarded(async (c) => {
  const sinceRaw = c.req.query('since')
  const since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 24 * 3600 * 1000)
  if (Number.isNaN(since.getTime())) return c.json({ error: 'invalid since' }, 400)
  const rows = await MonitorRepository.rowsSince(since, env.workerId)
  return c.json({ rows })
}))

router.get('/config/snapshot', guarded(async (c) => {
  return c.json(await ReplicationService.serveSnapshot(c.req.query('since')))
}))

export default router
