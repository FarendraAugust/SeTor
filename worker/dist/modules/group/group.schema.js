import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
export const monitorGroups = pgTable('monitor_groups', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    monitors: jsonb('monitors').$type().notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
