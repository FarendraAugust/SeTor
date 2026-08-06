import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { apiKeys } from './api-key.schema.js'
import { ReplicationService } from '../replication/replication.service.js'
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

  async create(data: Partial<NewApiKey>): Promise<ApiKey> {
    const [row] = await dbShared.insert(apiKeys).values(data as NewApiKey).returning()
    await ReplicationService.record('api_keys', 'insert', row as unknown as Record<string, unknown>)
    return row
  },

  async update(id: number, data: Partial<NewApiKey>): Promise<ApiKey | undefined> {
    const [row] = await dbShared.update(apiKeys).set(data).where(eq(apiKeys.id, id)).returning()
    if (row) await ReplicationService.record('api_keys', 'update', row as unknown as Record<string, unknown>)
    return row
  },

  touch(id: number): Promise<void> {
    return dbShared.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, id)).then(() => {})
  },

  async remove(id: number): Promise<void> {
    await dbShared.delete(apiKeys).where(eq(apiKeys.id, id))
    await ReplicationService.record('api_keys', 'delete', { id })
  },
} as const
