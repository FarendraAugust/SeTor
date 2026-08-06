import { pgTable, bigserial, bigint, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

/** Log perubahan config (append-only, ditulis hanya oleh leader). */
export const configLog = pgTable('config_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tableName: text('table_name').notNull(),
  action: text('action').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Watermark sync per node (config rev terakhir + hasil monitoring terakhir). */
export const syncState = pgTable('sync_state', {
  nodeId: text('node_id').primaryKey(),
  lastConfigRev: bigint('last_config_rev', { mode: 'number' }).notNull().default(0),
  lastResultsAt: timestamp('last_results_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
