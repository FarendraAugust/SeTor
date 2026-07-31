import { HttpError } from '../../common/errors/http-error.js'
import { ProxyRepository } from './proxy.repository.js'
import type { ProxyInput } from './proxy.types.js'

const PROTOCOLS = ['http', 'https', 'socks4', 'socks5']

export function validateProxy(input: Partial<ProxyInput>): ProxyInput {
  const name = input.name?.trim()
  const host = input.host?.trim()
  const protocol = input.protocol ?? 'http'
  if (!name) throw HttpError.badRequest('name is required')
  if (!host) throw HttpError.badRequest('host is required')
  if (!PROTOCOLS.includes(protocol)) throw HttpError.badRequest(`invalid protocol, must be one of: ${PROTOCOLS.join(', ')}`)
  if (!input.port || input.port < 1 || input.port > 65535) throw HttpError.badRequest('port must be between 1 and 65535')

  return {
    name,
    protocol: protocol as ProxyInput['protocol'],
    host,
    port: input.port,
    auth: input.auth?.username ? { username: input.auth.username, password: input.auth.password ?? '' } : undefined,
  }
}

export const ProxyService = {
  async list() {
    return ProxyRepository.findAll()
  },

  async get(id: number) {
    const p = await ProxyRepository.findById(id)
    if (!p) throw HttpError.notFound('proxy not found')
    return p
  },

  async create(input: ProxyInput) {
    return ProxyRepository.create(input)
  },

  async update(id: number, input: Partial<ProxyInput>) {
    await this.get(id)
    return ProxyRepository.update(id, input)
  },

  async remove(id: number) {
    await this.get(id)
    await ProxyRepository.remove(id)
  },

  async test(id: number) {
    const proxy = await this.get(id)
    const started = performance.now()
    return new Promise<{ ok: boolean; latency: number; error?: string }>((resolve) => {
      let done = false
      let socket: import('bun').Socket | null = null
      const finish = (ok: boolean, error?: string) => {
        if (done) return
        done = true
        clearTimeout(timer)
        try {
          socket?.end()
        } catch {}
        resolve({ ok, latency: Math.round((performance.now() - started) * 100) / 100, error })
      }
      const timer = setTimeout(() => finish(false, 'timeout'), 8000)
      Bun.connect({
        hostname: proxy.host,
        port: proxy.port,
        socket: {
          open() {
            finish(true)
          },
          data() {},
          error(_s, err) {
            finish(false, err?.message ?? 'connection error')
          },
          close() {
            finish(false, 'connection closed')
          },
        },
      })
        .then((sock) => {
          socket = sock
        })
        .catch((e: any) => {
          finish(false, e?.message ?? 'connection error')
        })
    })
  },
} as const
