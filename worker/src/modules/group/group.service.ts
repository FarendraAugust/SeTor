import { HttpError } from '../../common/errors/http-error.js'
import { GroupRepository } from './group.repository.js'
import type { MonitorGroupInput } from './group.types.js'

export function validateGroup(input: Partial<MonitorGroupInput>): MonitorGroupInput {
  const name = input.name?.trim()
  if (!name) throw HttpError.badRequest('name is required')
  return { name, monitors: input.monitors ?? [] }
}

export const GroupService = {
  async list() {
    return GroupRepository.findAll()
  },

  async get(id: number) {
    const g = await GroupRepository.findById(id)
    if (!g) throw HttpError.notFound('group not found')
    return g
  },

  async create(input: MonitorGroupInput) {
    return GroupRepository.create(input)
  },

  async update(id: number, input: Partial<MonitorGroupInput>) {
    await this.get(id)
    return GroupRepository.update(id, input)
  },

  async remove(id: number) {
    await this.get(id)
    await GroupRepository.remove(id)
  },
} as const
