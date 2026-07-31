import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
const client = postgres(env.sharedDatabaseUrl);
export const dbShared = drizzle(client);
