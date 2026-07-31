'use client'

import { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { MonitorList } from './MonitorList'
import { IncidentTimelineStrip, IncidentTimeline } from '@/components/monitors/IncidentTimelineStrip'
import { useApiData, useMonitoringEvents } from '@/hooks/useApi'
import { monitorsApi } from '@/lib/api'
import type { Monitor } from '@/types/monitor'

export function DashboardPage() {
  const { data: fetchedMonitors, reload } = useApiData<Monitor[]>(() => monitorsApi.list(), [])
  const { data: fetchedTags, reload: reloadTags } = useApiData<string[]>(() => monitorsApi.tags(), [])

  const onEvent = useCallback(() => {
    void reload()
    void reloadTags()
  }, [reload, reloadTags])
  useMonitoringEvents(onEvent)

  const monitors = fetchedMonitors ?? []
  const tags = fetchedTags ?? []

  const upCount = monitors.filter(m => m.status === 'up').length
  const downCount = monitors.filter(m => m.status === 'down').length
  const pendingCount = monitors.filter(m => m.status === 'pending').length
  const total = monitors.length
  const allUp = downCount === 0 && pendingCount === 0

  return (
    <div className="space-y-6 max-w-7xl">
      <style>
        {`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}
      </style>

      <h1 className="font-display text-2xl tracking-tight text-foreground/90">
        UBIG Monitoring
      </h1>

      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
        <span className={`relative flex size-3 ${allUp ? '' : downCount > 0 ? 'animate-pulse' : ''}`}>
          <span
            className={cn(
              'absolute inset-0 rounded-full',
              allUp ? 'bg-green-500' : downCount > 0 ? 'bg-slate-500' : 'bg-amber-400',
              allUp && 'animate-ping opacity-75',
            )}
          />
          <span
            className={cn(
              'relative inline-flex rounded-full size-3',
              allUp ? 'bg-green-500' : downCount > 0 ? 'bg-slate-500' : 'bg-amber-400',
            )}
          />
        </span>
        <span className="text-sm font-medium">
          {allUp
            ? 'All Systems Operational'
            : downCount > 0
              ? `${downCount} System${downCount > 1 ? 's' : ''} Down`
              : `${pendingCount} System${pendingCount > 1 ? 's' : ''} Pending`}
        </span>
      </div>

      <IncidentTimelineStrip monitors={monitors} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
              Total
            </p>
            <p className="text-2xl font-bold mt-1 font-mono">{total}</p>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-[fadeIn_0.3s_ease-out_0.1s_forwards]">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
              Operational
            </p>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400 font-mono">{upCount}</p>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-[fadeIn_0.3s_ease-out_0.2s_forwards]">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
              Down
            </p>
            <p className="text-2xl font-bold mt-1 text-destructive font-mono">{downCount}</p>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-[fadeIn_0.3s_ease-out_0.3s_forwards]">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
              Pending
            </p>
            <p className="text-2xl font-bold mt-1 text-(--warning) font-mono">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      <IncidentTimeline monitors={monitors} />

      <MonitorList monitors={monitors} allTags={tags} showAddButton={true} />
    </div>
  )
}
