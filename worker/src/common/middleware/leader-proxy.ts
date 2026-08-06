import type { Context, Next } from 'hono'
import { LeaderService } from '../../modules/leader/leader.service.js'

/**
 * Proxy follower → leader.
 * Semua request aplikasi (baca & tulis) diteruskan ke leader sehingga:
 * - view selalu konsisten (data konsensus hanya ada di leader)
 * - semua write mendarat di leader (authority id serial + config_log)
 * Endpoint yang dikecualikan (lokal per node): /health, /internal/*,
 * /metrics (prometheus per node), /api/push (push diterima node mana pun),
 * /workers (registry peer yang di-maintain tiap node via heartbeat).
 */

const ALLOWLIST = ['/health', '/internal', '/metrics', '/api/push', '/workers']

const HOP_BY_HOP = [
  'connection', 'keep-alive', 'transfer-encoding', 'upgrade',
  'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'host', 'content-length',
]

export async function leaderProxy(c: Context, next: Next) {
  if (LeaderService.isLeader()) return next()

  const path = c.req.path
  if (ALLOWLIST.some((p) => path.startsWith(p))) return next()

  const leaderUrl = LeaderService.leaderPublicUrl()
  if (!leaderUrl) {
    return c.json({ error: 'leader unavailable, election in progress' }, 503)
  }

  const url = new URL(c.req.url)
  const upstreamUrl = leaderUrl + url.pathname + url.search
  const isSSE = path === '/dashboard/events'

  const headers = new Headers()
  for (const [k, v] of c.req.raw.headers.entries()) {
    if (!HOP_BY_HOP.includes(k.toLowerCase())) headers.set(k, v)
  }

  const init: RequestInit = { method: c.req.method, headers, redirect: 'manual' }
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.raw.body) {
    init.body = c.req.raw.body
    ;(init as RequestInit & { duplex: 'half' }).duplex = 'half'
  }
  if (!isSSE) init.signal = AbortSignal.timeout(30_000)

  try {
    const upstream = await fetch(upstreamUrl, init)
    const resHeaders = new Headers()
    for (const [k, v] of upstream.headers.entries()) {
      if (!HOP_BY_HOP.includes(k.toLowerCase())) resHeaders.set(k, v)
    }
    try {
      const cookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
      for (const cookie of cookies) resHeaders.append('set-cookie', cookie)
    } catch {
      // header set-cookie tidak tersedia — abaikan
    }
    return new Response(upstream.body, { status: upstream.status, headers: resHeaders })
  } catch (e: any) {
    console.error('[proxy] leader unreachable:', e.message)
    return c.json({ error: 'leader unreachable, election in progress' }, 503)
  }
}
