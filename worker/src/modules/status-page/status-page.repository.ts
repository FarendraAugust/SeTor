import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { statusPages } from './status-page.schema.js'
import { ReplicationService } from '../replication/replication.service.js'
import type { StatusPage, NewStatusPage } from './status-page.types.js'

export const StatusPageRepository = {
  findAll(): Promise<StatusPage[]> {
    return dbShared.select().from(statusPages)
  },

  findById(id: number): Promise<StatusPage | undefined> {
    return dbShared.select().from(statusPages).where(eq(statusPages.id, id)).then((r) => r[0])
  },

  findBySlug(slug: string): Promise<StatusPage | undefined> {
    return dbShared.select().from(statusPages).where(eq(statusPages.slug, slug)).then((r) => r[0])
  },

  async create(data: Partial<NewStatusPage>): Promise<StatusPage> {
    const [row] = await dbShared.insert(statusPages).values(data as NewStatusPage).returning()
    await ReplicationService.record('status_pages', 'insert', row as unknown as Record<string, unknown>)
    return row
  },

  async update(id: number, data: Partial<NewStatusPage>): Promise<StatusPage | undefined> {
    const [row] = await dbShared.update(statusPages).set(data).where(eq(statusPages.id, id)).returning()
    if (row) await ReplicationService.record('status_pages', 'update', row as unknown as Record<string, unknown>)
    return row
  },

  async remove(id: number): Promise<void> {
    await dbShared.delete(statusPages).where(eq(statusPages.id, id))
    await ReplicationService.record('status_pages', 'delete', { id })
  },
} as const
