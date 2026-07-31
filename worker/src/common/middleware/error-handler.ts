import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { HttpError } from '../errors/http-error.js'

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode)
  }

  console.error('[unhandled]', err)
  return c.json({ error: 'internal server error' }, 500)
}
