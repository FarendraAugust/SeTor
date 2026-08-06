import { eq, sql, desc, and } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { configLog, syncState } from './replication.schema.js'
import { users, sessions } from '../auth/auth.schema.js'
import { targets } from '../target/target.schema.js'
import { notifications } from '../notification/notification.schema.js'
import { statusPages } from '../status-page/status-page.schema.js'
import { maintenanceWindows } from '../maintenance/maintenance.schema.js'
import { proxies } from '../proxy/proxy.schema.js'
import { apiKeys } from '../api-key/api-key.schema.js'
import { monitorGroups } from '../group/group.schema.js'
import { LeaderService } from '../leader/leader.service.js'
import { env } from '../../config/env.js'

const LOG_RETENTION = 100_000

/**
 * Replikasi data shared (config) per node:
 * - Semua write hanya sampai ke leader (non-leader mem-proxy write ke leader),
 *   lalu leader mencatat setiap perubahan ke `config_log`.
 * - Follower menge-poll `GET /internal/config/snapshot?since=<rev>` dan
 *   meng-apply perubahan → setiap node punya salinan data shared yang sama.
 * - Fallback full-dump saat follower ketinggalan (baru join / lama offline).
 */

type TableDef = {
  name: string
  /** Kolom timestamp — payload JSON datang dengan string, harus dikonversi ke Date sebelum insert */
  dateColumns: string[]
  selectAll: () => Promise<Array<Record<string, unknown>>>
  upsert: (row: Record<string, unknown>) => Promise<void>
  remove: (id: string | number) => Promise<void>
}

function fixDates(row: Record<string, unknown>, dateColumns: string[]): Record<string, unknown> {
  if (!row || dateColumns.length === 0) return row
  const out: Record<string, unknown> = { ...row }
  for (const col of dateColumns) {
    const v = out[col]
    if (typeof v === 'string') out[col] = new Date(v)
  }
  return out
}

/** Replikasi membawa id eksplisit yang TIDAK menyetel sequence → setval ke max(id) setelah apply. */
async function syncSequence(table: string): Promise<void> {
  await dbShared.execute(
    sql`SELECT setval(pg_get_serial_sequence(${table}, 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${sql.raw(table)}))`,
  ).catch(() => {})
}

const REPLICATED: TableDef[] = [
  { name: 'users', dateColumns: ['createdAt', 'updatedAt'], selectAll: () => dbShared.select().from(users) as never, upsert: (r) => dbShared.insert(users).values(fixDates(r, ['createdAt', 'updatedAt']) as never).onConflictDoUpdate({ target: users.id, set: fixDates(r, ['createdAt', 'updatedAt']) as never }).then(() => {}), remove: (id) => dbShared.delete(users).where(eq(users.id, id as never)).then(() => {}) },
  { name: 'sessions', dateColumns: ['expiresAt', 'createdAt'], selectAll: () => dbShared.select().from(sessions) as never, upsert: (r) => dbShared.insert(sessions).values(fixDates(r, ['expiresAt', 'createdAt']) as never).onConflictDoUpdate({ target: sessions.id, set: fixDates(r, ['expiresAt', 'createdAt']) as never }).then(() => {}), remove: (id) => dbShared.delete(sessions).where(eq(sessions.id, id as never)).then(() => {}) },
  { name: 'targets', dateColumns: ['createdAt', 'updatedAt'], selectAll: () => dbShared.select().from(targets) as never, upsert: (r) => dbShared.insert(targets).values(fixDates(r, ['createdAt', 'updatedAt']) as never).onConflictDoUpdate({ target: targets.id, set: fixDates(r, ['createdAt', 'updatedAt']) as never }).then(() => {}), remove: (id) => dbShared.delete(targets).where(eq(targets.id, id as never)).then(() => {}) },
  { name: 'notifications', dateColumns: ['createdAt'], selectAll: () => dbShared.select().from(notifications) as never, upsert: (r) => dbShared.insert(notifications).values(fixDates(r, ['createdAt']) as never).onConflictDoUpdate({ target: notifications.id, set: fixDates(r, ['createdAt']) as never }).then(() => {}), remove: (id) => dbShared.delete(notifications).where(eq(notifications.id, id as never)).then(() => {}) },
  { name: 'status_pages', dateColumns: ['createdAt'], selectAll: () => dbShared.select().from(statusPages) as never, upsert: (r) => dbShared.insert(statusPages).values(fixDates(r, ['createdAt']) as never).onConflictDoUpdate({ target: statusPages.id, set: fixDates(r, ['createdAt']) as never }).then(() => {}), remove: (id) => dbShared.delete(statusPages).where(eq(statusPages.id, id as never)).then(() => {}) },
  { name: 'maintenance_windows', dateColumns: ['startTime', 'endTime', 'createdAt'], selectAll: () => dbShared.select().from(maintenanceWindows) as never, upsert: (r) => dbShared.insert(maintenanceWindows).values(fixDates(r, ['startTime', 'endTime', 'createdAt']) as never).onConflictDoUpdate({ target: maintenanceWindows.id, set: fixDates(r, ['startTime', 'endTime', 'createdAt']) as never }).then(() => {}), remove: (id) => dbShared.delete(maintenanceWindows).where(eq(maintenanceWindows.id, id as never)).then(() => {}) },
  { name: 'proxies', dateColumns: ['createdAt'], selectAll: () => dbShared.select().from(proxies) as never, upsert: (r) => dbShared.insert(proxies).values(fixDates(r, ['createdAt']) as never).onConflictDoUpdate({ target: proxies.id, set: fixDates(r, ['createdAt']) as never }).then(() => {}), remove: (id) => dbShared.delete(proxies).where(eq(proxies.id, id as never)).then(() => {}) },
  { name: 'api_keys', dateColumns: ['createdAt', 'lastUsed'], selectAll: () => dbShared.select().from(apiKeys) as never, upsert: (r) => dbShared.insert(apiKeys).values(fixDates(r, ['createdAt', 'lastUsed']) as never).onConflictDoUpdate({ target: apiKeys.id, set: fixDates(r, ['createdAt', 'lastUsed']) as never }).then(() => {}), remove: (id) => dbShared.delete(apiKeys).where(eq(apiKeys.id, id as never)).then(() => {}) },
  { name: 'monitor_groups', dateColumns: ['createdAt'], selectAll: () => dbShared.select().from(monitorGroups) as never, upsert: (r) => dbShared.insert(monitorGroups).values(fixDates(r, ['createdAt']) as never).onConflictDoUpdate({ target: monitorGroups.id, set: fixDates(r, ['createdAt']) as never }).then(() => {}), remove: (id) => dbShared.delete(monitorGroups).where(eq(monitorGroups.id, id as never)).then(() => {}) },
]

export const REPLICATED_TABLE_NAMES = REPLICATED.map((t) => t.name)

function tableByName(name: string): TableDef | undefined {
  return REPLICATED.find((t) => t.name === name)
}

/** Catat perubahan config (hanya leader yang menulis). */
async function record(tableName: string, action: 'insert' | 'update' | 'delete', payload: Record<string, unknown>): Promise<void> {
  if (!LeaderService.isLeader()) return
  const [row] = await dbShared.insert(configLog).values({ tableName, action, payload }).returning({ id: configLog.id })
  if (!row) return
  if (row.id % 100 === 0) {
    const [maxRow] = await dbShared.select({ max: sql<number>`max(id)` }).from(configLog)
    const cutoff = (maxRow?.max ?? 0) - LOG_RETENTION
    if (cutoff > 0) {
      await dbShared.delete(configLog).where(sql`id < ${cutoff}`).catch(() => {})
    }
  }
}

async function applyChange(change: { tableName: string; action: string; payload: Record<string, unknown> }) {
  const def = tableByName(change.tableName)
  if (!def) return
  if (change.action === 'delete') {
    const id = change.payload?.id
    if (id != null) await def.remove(id as string | number)
  } else {
    await def.upsert(change.payload)
    await syncSequence(change.tableName)
  }
}

async function applyFullDump(tables: Record<string, Array<Record<string, unknown>>>) {
  for (const name of REPLICATED_TABLE_NAMES) {
    const def = tableByName(name)
    if (!def) continue
    for (const r of tables[name] ?? []) await def.upsert(r)
    await syncSequence(name)
  }
}

/** Poll snapshot config dari leader (dijalankan follower). */
async function pollConfigFromLeader(): Promise<void> {
  const leaderUrl = LeaderService.leaderPublicUrl()
  if (!leaderUrl || LeaderService.isLeader()) return

  const [stateRow] = await dbShared.select().from(syncState).where(eq(syncState.nodeId, env.workerId))
  const lastRev = stateRow?.lastConfigRev ?? 0

  try {
    const res = await fetch(`${leaderUrl}/internal/config/snapshot?since=${lastRev}`, {
      headers: { 'X-Internal-Token': env.internalToken },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return
    const data = await res.json() as {
      full?: boolean
      changes?: Array<{ id: number; tableName: string; action: string; payload: Record<string, unknown> }>
      maxRev: number
      tables?: Record<string, Array<Record<string, unknown>>>
    }

    if (data.full && data.tables) {
      await applyFullDump(data.tables)
    } else {
      for (const change of data.changes ?? []) await applyChange(change)
    }

    const rev = data.maxRev ?? lastRev
    if (rev >= lastRev) {
      await dbShared.insert(syncState).values({ nodeId: env.workerId, lastConfigRev: rev, lastResultsAt: stateRow?.lastResultsAt ?? new Date() })
        .onConflictDoUpdate({ target: syncState.nodeId, set: { lastConfigRev: rev, updatedAt: new Date() } })
    }
  } catch (e: any) {
    console.error('[replication] config poll failed:', e.message)
  }
}

/** Sajikan snapshot config (route /internal/config/snapshot). */
async function serveSnapshot(sinceRaw: string | undefined): Promise<Record<string, unknown>> {
  const since = Number(sinceRaw ?? 0)

  const [minRow] = await dbShared.select({ min: sql<number>`min(id)` }).from(configLog)
  const [maxRow] = await dbShared.select({ max: sql<number>`max(id)` }).from(configLog)
  const minRev = minRow?.min ?? 0
  const maxRev = maxRow?.max ?? 0

  // Full dump untuk node baru / yang ketinggalan jauh
  if (since === 0 || since < minRev) {
    const tables: Record<string, Array<Record<string, unknown>>> = {}
    for (const def of REPLICATED) tables[def.name] = await def.selectAll()
    return { full: true, maxRev, tables }
  }

  const changes = await dbShared.select()
    .from(configLog)
    .where(and(sql`id > ${since}`, sql`id <= ${maxRev}`))
    .orderBy(desc(configLog.id))
    .limit(5000)

  return { full: false, maxRev, changes: changes.reverse().map((c) => ({ id: c.id, tableName: c.tableName, action: c.action, payload: c.payload })) }
}

async function getSyncState(): Promise<{ lastResultsAt: Date }> {
  const [row] = await dbShared.select().from(syncState).where(eq(syncState.nodeId, env.workerId))
  if (row) return { lastResultsAt: row.lastResultsAt }
  const now = new Date()
  await dbShared.insert(syncState).values({ nodeId: env.workerId, lastResultsAt: now }).catch(() => {})
  return { lastResultsAt: now }
}

async function setSyncState(lastResultsAt: Date) {
  await dbShared.insert(syncState).values({ nodeId: env.workerId, lastResultsAt })
    .onConflictDoUpdate({ target: syncState.nodeId, set: { lastResultsAt, updatedAt: new Date() } })
}

/** Ambil hasil monitoring peer (leader saat backfill setelah election). */
async function fetchPeerResults(peerUrl: string, since: Date): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${peerUrl}/internal/results?since=${encodeURIComponent(since.toISOString())}`, {
      headers: { 'X-Internal-Token': env.internalToken },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json() as { rows: Array<Record<string, unknown>> }
    return data.rows ?? []
  } catch {
    return []
  }
}

let syncStarted = false

export const ReplicationService = {
  record,
  REPLICATED_TABLE_NAMES,
  serveSnapshot,
  applyChange,
  applyFullDump,

  async pollConfig() {
    await pollConfigFromLeader()
  },

  async getSyncState() {
    return getSyncState()
  },

  async setSyncState(lastResultsAt: Date) {
    await setSyncState(lastResultsAt)
  },

  async backfillFromPeers(since: Date): Promise<Array<Record<string, unknown>>> {
    const rows: Array<Record<string, unknown>> = []
    for (const url of LeaderService.peerUrls()) {
      rows.push(...await fetchPeerResults(url, since))
    }
    return rows
  },

  start() {
    if (syncStarted) return
    syncStarted = true
    setInterval(() => pollConfigFromLeader().catch((e: any) => console.error('[replication] loop error:', e?.message)), env.configSyncMs)
  },
} as const
