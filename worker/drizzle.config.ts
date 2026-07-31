import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: [
    './src/modules/auth/auth.schema.ts',
    './src/modules/leader/leader.schema.ts',
    './src/modules/target/target.schema.ts',
    './src/modules/notification/notification.schema.ts',
    './src/modules/status-page/status-page.schema.ts',
    './src/modules/maintenance/maintenance.schema.ts',
    './src/modules/proxy/proxy.schema.ts',
    './src/modules/api-key/api-key.schema.ts',
    './src/modules/group/group.schema.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
