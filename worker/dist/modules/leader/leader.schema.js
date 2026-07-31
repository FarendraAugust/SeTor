import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
export const workers = pgTable('workers', {
    id: text('id').primaryKey(),
    host: text('host').notNull(),
    port: integer('port').notNull().default(3001),
    isLeader: boolean('is_leader').notNull().default(false),
    lastHeartbeat: timestamp('last_heartbeat').defaultNow().notNull(),
    electedAt: timestamp('elected_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
