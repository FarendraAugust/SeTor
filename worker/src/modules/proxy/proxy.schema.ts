import { pgTable, serial, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const proxies = pgTable('proxies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  protocol: text('protocol').notNull().default('http'),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  auth: jsonb('auth').$type<{ username: string; password: string } | null>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
