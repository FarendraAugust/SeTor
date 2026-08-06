import { HttpError } from '../../common/errors/http-error.js'
import { MaintenanceRepository } from './maintenance.repository.js'
import { and, eq, lte, gte } from 'drizzle-orm'
import { maintenanceWindows } from './maintenance.schema.js'
import { dbShared } from '../../database/shared.js'
import type { MaintenanceWindowInput } from './maintenance.types.js'

export function validateMaintenance(input: Partial<MaintenanceWindowInput>): MaintenanceWindowInput {
  const title = input.title?.trim()
  if (!title) throw HttpError.badRequest('title is required')
  if (!input.startTime) throw HttpError.badRequest('startTime is required')
  if (!input.endTime) throw HttpError.badRequest('endTime is required')

  const start = new Date(input.startTime)
  const end = new Date(input.endTime)
  if (Number.isNaN(start.getTime())) throw HttpError.badRequest('invalid startTime')
  if (Number.isNaN(end.getTime())) throw HttpError.badRequest('invalid endTime')
  if (end <= start) throw HttpError.badRequest('endTime must be after startTime')

  return {
    title,
    description: input.description?.trim() ?? '',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    monitors: input.monitors ?? [],
    active: input.active ?? true,
  }
}

export const MaintenanceService = {
  async list() {
    return MaintenanceRepository.findAll()
  },

  async get(id: number) {
    const mw = await MaintenanceRepository.findById(id)
    if (!mw) throw HttpError.notFound('maintenance window not found')
    return mw
  },

  async create(input: MaintenanceWindowInput) {
    return MaintenanceRepository.create({
      ...input,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
    })
  },

  async update(id: number, input: Partial<MaintenanceWindowInput>) {
    await this.get(id)
    return MaintenanceRepository.update(id, {
      ...input,
      startTime: input.startTime ? new Date(input.startTime) : undefined,
      endTime: input.endTime ? new Date(input.endTime) : undefined,
    })
  },

  async remove(id: number) {
    await this.get(id)
    await MaintenanceRepository.remove(id)
  },

  /** True jika target sedang dalam maintenance window aktif (applies ke semua monitor jika monitors kosong). */
  async isTargetInMaintenance(targetId: number): Promise<boolean> {
    const now = new Date()
    const windows = await dbShared.select().from(maintenanceWindows)
      .where(and(eq(maintenanceWindows.active, true), lte(maintenanceWindows.startTime, now), gte(maintenanceWindows.endTime, now)))
    return windows.some((w) => (w.monitors ?? []).length === 0 || (w.monitors ?? []).includes(String(targetId)))
  },
} as const
