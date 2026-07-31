'use client'

import { useEffect, useRef } from 'react'
import type { Monitor } from '@/types/monitor'
import { cn } from '@/lib/utils'
import { useApiData } from '@/hooks/useApi'
import { monitorsApi } from '@/lib/api'
export { IncidentTimeline } from './IncidentTimeline'

interface IncidentTimelineStripProps {
  monitors: Monitor[]
  className?: string
}

const BAR_W = 6
const BEATS = 120

export function IncidentTimelineStrip({ monitors, className }: IncidentTimelineStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: allHeartbeats } = useApiData(
    () => Promise.all(monitors.map(m => monitorsApi.heartbeats(m.id, BEATS))),
    [monitors.map(m => m.id).join(',')],
  )
  const beatsByMonitor = allHeartbeats ?? []

  const aggregated = Array.from({ length: BEATS }).map((_, i) => {
    for (const beats of beatsByMonitor) {
      if (i < beats.length && beats[i].status === 'down') return 'down' as const
    }
    for (const beats of beatsByMonitor) {
      if (i < beats.length && beats[i].status === 'pending') return 'pending' as const
    }
    return 'up' as const
  })

  useEffect(() => {
    if (scrollRef.current && monitors.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [monitors.length])

  if (monitors.length === 0) {
    return (
      <div
        className={cn('flex items-stretch overflow-hidden bg-card border-b border-border max-h-24 md:max-h-none', className)}
      >
        <div className="flex gap-px flex-1 px-1">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="flex-1 bg-muted/10 rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-card border-b border-border max-h-24 md:max-h-none overflow-y-auto', className)}>
      <div ref={scrollRef} className="overflow-x-auto h-full scroll-smooth">
        <div className="flex items-stretch h-full" style={{ width: BEATS * BAR_W + 16, paddingRight: 16 }}>
          {aggregated.map((status, i) => (
            <div
              key={i}
              className="shrink-0"
              style={{
                width: BAR_W,
                backgroundColor:
                  status === 'up'
                    ? 'var(--up)'
                    : status === 'down'
                      ? 'var(--down)'
                      : 'var(--pending)',
                opacity: status === 'pending' ? 0.5 : 1,
              }}
              title={status}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 w-px bg-foreground/15 pointer-events-none z-10" />
    </div>
  )
}
