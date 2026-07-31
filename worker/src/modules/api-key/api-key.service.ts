import { randomBytes } from 'node:crypto'
import { HttpError } from '../../common/errors/http-error.js'
import { ApiKeyRepository } from './api-key.repository.js'
import type { ApiKeyInput } from './api-key.types.js'

export function validateApiKey(input: Partial<ApiKeyInput>): ApiKeyInput {
  const name = input.name?.trim()
  if (!name) throw HttpError.badRequest('name is required')
  return { name, active: input.active ?? true }
}

export const ApiKeyService = {
  async list() {
    return ApiKeyRepository.findAll()
  },

  async get(id: number) {
    const k = await ApiKeyRepository.findById(id)
    if (!k) throw HttpError.notFound('api key not found')
    return k
  },

  async create(input: ApiKeyInput) {
    const key = `ubig_pk_${randomBytes(24).toString('hex')}`
    return ApiKeyRepository.create({ ...input, key })
  },

  async update(id: number, input: Partial<ApiKeyInput>) {
    await this.get(id)
    return ApiKeyRepository.update(id, input)
  },

  async remove(id: number) {
    await this.get(id)
    await ApiKeyRepository.remove(id)
  },

  async verify(token: string) {
    const key = await ApiKeyRepository.findByKey(token)
    if (!key || !key.active) return null
    return key
  },
} as const
