import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { apiKeys } from './api-key.schema.js'
import type { ApiKey, NewApiKey } from './api-key.types.js'

export const ApiKeyRepository = {
  findAll(): Promise<ApiKey[]> {
    return dbShared.select().from(apiKeys)
  },

  findById(id: number): Promise<ApiKey | undefined> {
    return dbShared.select().from(apiKeys).where(eq(apiKeys.id, id)).then((r) => r[0])
  },

  findByKey(key: string): Promise<ApiKey | undefined> {
    return dbShared.select().from(apiKeys).where(eq(apiKeys.key, key)).then((r) => r[0])
  },

  create(data: Partial<NewApiKey>): Promise<ApiKey> {
    return dbShared.insert(apiKeys).values(data as NewApiKey).returning().then((r) => r[0])
  },

  update(id: number, data: Partial<NewApiKey>): Promise<ApiKey | undefined> {
    return dbShared.update(apiKeys).set(data).where(eq(apiKeys.id, id)).returning().then((r) => r[0])
  },

  touch(id: number): Promise<void> {
    return dbShared.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, id)).then(() => {})
  },

  remove(id: number): Promise<void> {
    return dbShared.delete(apiKeys).where(eq(apiKeys.id, id)).then(() => {})
  },
} as const
