import postgres from 'postgres'
import { env } from '../../config/env.js'
import type { BusEvent, BusHandler } from './bus.types.js'

class EventBus {
  private sql!: ReturnType<typeof postgres>
  private handlers = new Map<string, Set<BusHandler>>()
  readonly workerId: string = env.workerId

  async connect() {
    this.sql = postgres(env.sharedDatabaseUrl)
  }

  async subscribe(channel: string, handler: BusHandler) {
    const set = this.handlers.get(channel) ?? new Set()
    set.add(handler)
    this.handlers.set(channel, set)

    if (set.size === 1) {
      await this.sql.listen(channel, (payload: string) => {
        const event: BusEvent = JSON.parse(payload)
        for (const fn of this.handlers.get(channel) ?? []) fn(event)
      })
    }
  }

  unsubscribe(channel: string, handler: BusHandler) {
    const set = this.handlers.get(channel)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) this.handlers.delete(channel)
  }

  async emit(channel: string, type: string, data: unknown) {
    const event: BusEvent = { type, data, source: this.workerId, timestamp: Date.now() }
    await this.sql.notify(channel, JSON.stringify(event))
  }

  async disconnect() {
    await this.sql.end()
  }
}

export const bus = new EventBus()
