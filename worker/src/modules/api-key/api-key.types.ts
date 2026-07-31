import type { apiKeys } from './api-key.schema.js'

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert

export type ApiKeyInput = {
  name: string
  active?: boolean
}
