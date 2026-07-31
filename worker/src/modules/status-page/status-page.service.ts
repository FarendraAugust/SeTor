import { HttpError } from '../../common/errors/http-error.js'
import { StatusPageRepository } from './status-page.repository.js'
import type { StatusPageInput } from './status-page.types.js'

export function validateStatusPage(input: Partial<StatusPageInput>): StatusPageInput {
  const title = input.title?.trim()
  const slug = input.slug?.trim()?.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!title) throw HttpError.badRequest('title is required')
  if (!slug) throw HttpError.badRequest('slug is required')

  return {
    title,
    slug,
    active: input.active ?? true,
    monitors: input.monitors ?? [],
    customDomain: input.customDomain?.trim() || null,
    theme: input.theme ?? 'light',
    description: input.description?.trim() || null,
    showUptime: input.showUptime ?? true,
    showHistory: input.showHistory ?? true,
  }
}

export const StatusPageService = {
  async list() {
    return StatusPageRepository.findAll()
  },

  async get(id: number) {
    const sp = await StatusPageRepository.findById(id)
    if (!sp) throw HttpError.notFound('status page not found')
    return sp
  },

  async getBySlug(slug: string) {
    const sp = await StatusPageRepository.findBySlug(slug)
    if (!sp) throw HttpError.notFound('status page not found')
    return sp
  },

  async create(input: StatusPageInput) {
    const existing = await StatusPageRepository.findBySlug(input.slug)
    if (existing) throw HttpError.conflict('slug already in use')
    return StatusPageRepository.create(input)
  },

  async update(id: number, input: Partial<StatusPageInput>) {
    await this.get(id)
    return StatusPageRepository.update(id, input)
  },

  async remove(id: number) {
    await this.get(id)
    await StatusPageRepository.remove(id)
  },
} as const
