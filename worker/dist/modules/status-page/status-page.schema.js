import { pgTable, serial, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
export const statusPages = pgTable('status_pages', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    active: boolean('active').notNull().default(true),
    monitors: jsonb('monitors').$type().notNull().default([]),
    customDomain: text('custom_domain'),
    theme: text('theme'),
    description: text('description'),
    showUptime: boolean('show_uptime').notNull().default(true),
    showHistory: boolean('show_history').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
