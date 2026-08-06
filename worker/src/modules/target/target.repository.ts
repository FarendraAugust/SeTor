import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { targets } from './target.schema.js'
import { ReplicationService } from '../replication/replication.service.js'
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

  async create(data: Partial<NewTarget>): Promise<Target> {
    const [row] = await dbShared.insert(targets).values(data as NewTarget).returning()
    await ReplicationService.record('targets', 'insert', row as unknown as Record<string, unknown>)
    return row
  },

  async update(id: number, data: Partial<NewTarget>): Promise<Target | undefined> {
    const [row] = await dbShared.update(targets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(targets.id, id))
      .returning()
    if (row) await ReplicationService.record('targets', 'update', row as unknown as Record<string, unknown>)
    return row
  },

  async remove(id: number): Promise<void> {
    await dbShared.delete(targets).where(eq(targets.id, id))
    await ReplicationService.record('targets', 'delete', { id })
  },
} as const
