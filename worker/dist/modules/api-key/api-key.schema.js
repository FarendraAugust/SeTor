import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';
export const apiKeys = pgTable('api_keys', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastUsed: timestamp('last_used'),
});
