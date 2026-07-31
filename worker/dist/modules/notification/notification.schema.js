import { pgTable, serial, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
export const notifications = pgTable('notifications', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    config: jsonb('config').$type().notNull().default({}),
    active: boolean('active').notNull().default(true),
    applyTo: jsonb('apply_to').$type().notNull().default([]),
    customMessage: text('custom_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
