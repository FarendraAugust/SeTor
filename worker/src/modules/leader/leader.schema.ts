import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'

export const clusterState = pgTable('cluster_state', {
  nodeId: text('node_id').primaryKey(),
  term: integer('term').notNull().default(0),
  state: text('state').notNull().default('follower'),
  leaderId: text('leader_id'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const workers = pgTable('workers', {
  id: text('id').primaryKey(),
  host: text('host').notNull(),
  port: integer('port').notNull().default(3001),
  publicUrl: text('public_url').notNull(),
  isLeader: boolean('is_leader').notNull().default(false),
  term: integer('term').notNull().default(0),
  lastHeartbeat: timestamp('last_heartbeat').defaultNow().notNull(),
  electedAt: timestamp('elected_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
