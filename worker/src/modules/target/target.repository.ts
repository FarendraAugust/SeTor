import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { targets } from './target.schema.js'
import type { Target, NewTarget } from './target.types.js'

export const TargetRepository = {
  findAll(): Promise<Target[]> {
    return dbShared.select().from(targets)
  },

  findEnabled(): Promise<Target[]> {
    return dbShared.select().from(targets).where(eq(targets.enabled, true))
  },

  findById(id: number): Promise<Target | undefined> {
    return dbShared.select().from(targets).where(eq(targets.id, id)).then((r) => r[0])
  },

  findByPushToken(token: string): Promise<Target | undefined> {
    return dbShared.select().from(targets).where(eq(targets.pushToken, token)).then((r) => r[0])
  },

  create(data: Partial<NewTarget>): Promise<Target> {
    return dbShared.insert(targets).values(data as NewTarget).returning().then((r) => r[0])
  },

  update(id: number, data: Partial<NewTarget>): Promise<Target | undefined> {
    return dbShared.update(targets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(targets.id, id))
      .returning()
      .then((r) => r[0])
  },

  remove(id: number): Promise<void> {
    return dbShared.delete(targets).where(eq(targets.id, id)).then(() => {})
  },
} as const
