import type { statusPages } from './status-page.schema.js'

export type StatusPage = typeof statusPages.$inferSelect
export type NewStatusPage = typeof statusPages.$inferInsert

export type StatusPageInput = {
  title: string
  slug: string
  active?: boolean
  monitors?: string[]
  customDomain?: string | null
  theme?: string | null
  description?: string | null
  showUptime?: boolean
  showHistory?: boolean
}
