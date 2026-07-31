import { pgTable, serial, text, integer, real, timestamp } from 'drizzle-orm/pg-core';
export const monitoring = pgTable('monitoring', {
    id: serial('id').primaryKey(),
    targetId: integer('target_id').notNull(),
    targetName: text('target_name').notNull(),
    status: text('status').notNull().default('unknown'),
    responseTime: real('response_time'),
    statusCode: integer('status_code'),
    ping: real('ping'),
    error: text('error'),
    checkedAt: timestamp('checked_at').notNull(),
    workerId: text('worker_id').notNull(),
});
