import type { proxies } from './proxy.schema.js'

export type Proxy = typeof proxies.$inferSelect
export type NewProxy = typeof proxies.$inferInsert

export type ProxyInput = {
  name: string
  protocol: 'http' | 'https' | 'socks4' | 'socks5'
  host: string
  port: number
  auth?: { username: string; password: string }
}
