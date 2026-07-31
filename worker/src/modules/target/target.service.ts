import { HttpError } from '../../common/errors/http-error.js'
import { TargetRepository } from './target.repository.js'
import type { TargetInput } from './target.types.js'

export const TargetService = {
  async list() {
    return TargetRepository.findAll()
  },

  async get(id: number) {
    const target = await TargetRepository.findById(id)
    if (!target) throw HttpError.notFound('target not found')
    return target
  },

  async create(input: TargetInput) {
    return TargetRepository.create(input)
  },

  async update(id: number, input: Partial<TargetInput>) {
    const existing = await TargetRepository.findById(id)
    if (!existing) throw HttpError.notFound('target not found')
    return TargetRepository.update(id, input)
  },

  async remove(id: number) {
    const existing = await TargetRepository.findById(id)
    if (!existing) throw HttpError.notFound('target not found')
    await TargetRepository.remove(id)
  },
} as const
