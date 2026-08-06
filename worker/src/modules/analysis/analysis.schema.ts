import { pgTable, bigserial, bigint, text, jsonb, timestamp, integer, boolean, serial } from 'drizzle-orm/pg-core'

/** State consensus tiap target (leader only, local DB). */
export const monitorState = pgTable('monitor_state', {
  targetId: integer('target_id').primaryKey(),
  status: text('status').notNull().default('pending'),
  votes: jsonb('votes').$type<Record<string, string>>().notNull().default({}),
  responseTime: integer('response_time'),
  lastCheckedAt: timestamp('last_checked_at'),
  inMaintenance: boolean('in_maintenance').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Riwayat konsensus per check (leader only, local DB) — basis perhitungan uptime. */
export const analysis = pgTable('analysis', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  targetId: integer('target_id').notNull(),
  checkedAt: timestamp('checked_at').notNull(),
  status: text('status').notNull(),
  responseTime: integer('response_time'),
  degraded: boolean('degraded').notNull().default(false),
  votes: jsonb('votes').$type<Record<string, string>>().notNull().default({}),
})

/** Insiden berbasis transisi status konsensus (leader only, local DB). */
export const incidents = pgTable('incidents', {
  id: serial('id').primaryKey(),
  targetId: integer('target_id').notNull(),
  targetName: text('target_name').notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
  resolved: boolean('resolved').notNull().default(false),
  durationMs: bigint('duration_ms', { mode: 'number' }),
})

/** State notifikasi per target — dedup aman saat failover (leader only, local DB). */
export const alertState = pgTable('alert_state', {
  targetId: integer('target_id').primaryKey(),
  lastStatus: text('last_status').notNull().default('pending'),
  lastNotifiedAt: timestamp('last_notified_at'),
  /** Jumlah siklus down berturut-turut (streak) — basis threshold "N kali down sebelum alert". */
  downCount: integer('down_count').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
