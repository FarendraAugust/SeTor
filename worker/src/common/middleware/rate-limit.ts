import type { MiddlewareHandler } from 'hono'
import { HttpError } from '../errors/http-error.js'

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

export function rateLimit(max: number, windowMs: number): MiddlewareHandler {
  return async (c, next) => {
    const key = c.req.header('x-forwarded-for') ?? 'local'
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (entry.count >= max) throw HttpError.tooMany()
    entry.count++
    return next()
  }
}
