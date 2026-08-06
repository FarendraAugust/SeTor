import { env } from '../../config/env.js'
import type { BusEvent, BusHandler } from './bus.types.js'

/**
 * Event bus lokal (in-process). Tidak lagi memakai PG LISTEN/NOTIFY karena
 * shared DB kini replikasi per-node. Event monitoring follower dikirim ke
 * leader lewat /internal/sync/results, lalu leader yang menyalurkan ke SSE.
 */
class EventBus {
  private handlers = new Map<string, Set<BusHandler>>()
  readonly workerId: string = env.workerId

  async connect() {
    // no-op — bus lokal
  }

  subscribe(channel: string, handler: BusHandler) {
    const set = this.handlers.get(channel) ?? new Set()
    set.add(handler)
    this.handlers.set(channel, set)
  }

  unsubscribe(channel: string, handler: BusHandler) {
    const set = this.handlers.get(channel)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) this.handlers.delete(channel)
  }

  async emit(channel: string, type: string, data: unknown) {
    const event: BusEvent = { type, data, source: this.workerId, timestamp: Date.now() }
    for (const fn of this.handlers.get(channel) ?? []) {
      try {
        await fn(event)
      } catch (e: any) {
        console.error(`[bus] handler error on ${channel}: ${e.message}`)
      }
    }
  }

  async disconnect() {
    this.handlers.clear()
  }
}

export const bus = new EventBus()
