export type Theme = 'light' | 'dark'

export type Status = 'up' | 'down' | 'pending' | 'unknown'

export type MonitorType = 'http' | 'ping' | 'tcp' | 'dns' | 'keyword' | 'websocket' | 'json-query' | 'push' | 'steam' | 'docker'

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
}
