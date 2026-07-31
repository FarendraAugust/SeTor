import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Status } from '@/types/common'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUptime(value: number): string {
  return `${value.toFixed(2)}%`
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

export function statusBgClass(status: Status): string {
  switch (status) {
    case 'up': return 'bg-green-500'
    case 'down': return 'bg-destructive'
    case 'pending': return 'bg-yellow-500'
    case 'unknown': return 'bg-muted-foreground'
  }
}

export function statusLabel(status: Status): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function getMonitorTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    http: '🌐',
    ping: '📡',
    tcp: '🔌',
    dns: '🔍',
    keyword: '📝',
    websocket: '🔗',
  }
  return icons[type] || '❓'
}
