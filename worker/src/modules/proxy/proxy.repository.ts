import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { proxies } from './proxy.schema.js'
import type { Proxy, NewProxy } from './proxy.types.js'

export const ProxyRepository = {
  findAll(): Promise<Proxy[]> {
    return dbShared.select().from(proxies)
  },

  findById(id: number): Promise<Proxy | undefined> {
    return dbShared.select().from(proxies).where(eq(proxies.id, id)).then((r) => r[0])
  },

  create(data: Partial<NewProxy>): Promise<Proxy> {
    return dbShared.insert(proxies).values(data as NewProxy).returning().then((r) => r[0])
  },

  update(id: number, data: Partial<NewProxy>): Promise<Proxy | undefined> {
    return dbShared.update(proxies).set(data).where(eq(proxies.id, id)).returning().then((r) => r[0])
  },

  remove(id: number): Promise<void> {
    return dbShared.delete(proxies).where(eq(proxies.id, id)).then(() => {})
  },
} as const
