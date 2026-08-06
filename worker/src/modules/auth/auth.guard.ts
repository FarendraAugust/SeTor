import { verify } from 'hono/jwt'
import type { MiddlewareHandler } from 'hono'
import { env } from '../../config/env.js'
import type { JwtPayload } from './auth.types.js'

declare module 'hono' {
  interface ContextVariableMap {
    userId: number
    userEmail: string
  }
}

export const authGuard: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) return c.json({ error: 'unauthorized' }, 401)

  const token = header.slice(7)

  try {
    const payload = await verify(token, env.jwtSecret, 'HS256') as JwtPayload
    c.set('userId', payload.sub)
    c.set('userEmail', payload.email)
    return next()
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }
}
