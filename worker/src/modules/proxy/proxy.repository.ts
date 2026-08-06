import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { proxies } from './proxy.schema.js'
import { ReplicationService } from '../replication/replication.service.js'
import type { Proxy, NewProxy } from './proxy.types.js'

export const ProxyRepository = {
  findAll(): Promise<Proxy[]> {
    return dbShared.select().from(proxies)
  },

  findById(id: number): Promise<Proxy | undefined> {
    return dbShared.select().from(proxies).where(eq(proxies.id, id)).then((r) => r[0])
  },

  async create(data: Partial<NewProxy>): Promise<Proxy> {
    const [row] = await dbShared.insert(proxies).values(data as NewProxy).returning()
    await ReplicationService.record('proxies', 'insert', row as unknown as Record<string, unknown>)
    return row
  },

  async update(id: number, data: Partial<NewProxy>): Promise<Proxy | undefined> {
    const [row] = await dbShared.update(proxies).set(data).where(eq(proxies.id, id)).returning()
    if (row) await ReplicationService.record('proxies', 'update', row as unknown as Record<string, unknown>)
    return row
  },

  async remove(id: number): Promise<void> {
    await dbShared.delete(proxies).where(eq(proxies.id, id))
    await ReplicationService.record('proxies', 'delete', { id })
  },
} as const
