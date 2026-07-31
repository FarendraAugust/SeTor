import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { statusPages } from './status-page.schema.js'
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

  create(data: Partial<NewStatusPage>): Promise<StatusPage> {
    return dbShared.insert(statusPages).values(data as NewStatusPage).returning().then((r) => r[0])
  },

  update(id: number, data: Partial<NewStatusPage>): Promise<StatusPage | undefined> {
    return dbShared.update(statusPages).set(data).where(eq(statusPages.id, id)).returning().then((r) => r[0])
  },

  remove(id: number): Promise<void> {
    return dbShared.delete(statusPages).where(eq(statusPages.id, id)).then(() => {})
  },
} as const
