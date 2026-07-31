'use client'

import { useRouter } from 'next/navigation'
import { Globe, Wifi, Plug, Search, FileText, Link2, Code, Upload, Gamepad2, Container, Clock, History } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Monitor } from '@/types/monitor'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './StatusBadge'
import { cn, formatUptime, formatMs, timeAgo } from '@/lib/utils'
import { useHeartbeats } from '@/hooks/useApi'

const typeIcons: Record<string, LucideIcon> = {
  http: Globe,
  ping: Wifi,
  tcp: Plug,
  dns: Search,
  keyword: FileText,
  websocket: Link2,
  'json-query': Code,
  push: Upload,
  steam: Gamepad2,
  docker: Container,
}

const borderColor: Record<string, string> = {
  up: 'border-l-green-500',
  down: 'border-l-destructive',
  pending: 'border-l-(--warning)',
}

const uptimeColor: Record<string, string> = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-destructive',
  pending: 'text-(--warning)',
}

function MonitorTypeIcon({ type }: { type: string }) {
  const Icon = typeIcons[type] ?? Globe
  return <Icon className="size-4 shrink-0 text-muted-foreground" />
}

function HeartbeatSparkline({ monitorId }: { monitorId: string }) {
  const { heartbeats } = useHeartbeats(monitorId, 5)
  const beats = heartbeats
  if (beats.length === 0) return null

  const maxRt = Math.max(...beats.map(h => h.responseTime), 1)
  const w = Math.max(beats.length - 1, 1)
  const points = beats
    .map((h, i) => {
      const x = (i / w) * 100
      const y = 30 - ((h.responseTime / maxRt) * 22)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 32" className="w-full h-7 -mb-1" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="text-muted-foreground/40"
      />
    </svg>
  )
}

interface MonitorCardProps {
  monitor: Monitor
}

export function MonitorCard({ monitor }: MonitorCardProps) {
  const router = useRouter()
  const certWarning = monitor.certificate && monitor.certificate.daysRemaining < 30

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        'border-l-[3px]',
        borderColor[monitor.status],
      )}
      onClick={() => router.push(`/monitors/${monitor.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <MonitorTypeIcon type={monitor.type} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{monitor.name}</span>
                <StatusBadge status={monitor.status} size="sm" showLabel={false} />
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{monitor.url}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              Uptime
            </p>
            <p
              className={cn(
                'text-sm font-semibold font-mono',
                uptimeColor[monitor.status],
              )}
            >
              {monitor.status === 'pending' ? '\u2014' : formatUptime(monitor.uptime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            <span className="font-mono">
              {monitor.responseTime > 0 ? formatMs(monitor.responseTime) : '\u2014'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <History className="size-3.5" />
            <span className="font-mono">{timeAgo(monitor.lastChecked)}</span>
          </span>
          {certWarning && (
            <Badge
              variant="outline"
              className="ml-auto text-[10px] px-1.5 py-0 h-5 border-(--warning) text-(--warning)"
            >
              SSL {monitor.certificate!.daysRemaining}d
            </Badge>
          )}
        </div>

        {monitor.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {monitor.tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <HeartbeatSparkline monitorId={monitor.id} />
      </CardContent>
    </Card>
  )
}
