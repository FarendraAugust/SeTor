import { pgTable, serial, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const maintenanceWindows = pgTable('maintenance_windows', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  monitors: jsonb('monitors').$type<string[]>().notNull().default([]),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
