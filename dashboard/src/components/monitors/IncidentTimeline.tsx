'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Monitor } from '@/types/monitor'
import { cn } from '@/lib/utils'
import { useHeartbeats } from '@/hooks/useApi'

interface IncidentTimelineProps {
  monitors: Monitor[]
  className?: string
}

const BAR_W = 6
const ROW_H = 24
const LABEL_W = 160
const BEATS = 120
const CONTENT_W = LABEL_W + BEATS * BAR_W + 16

function Beat({ status }: { status: string }) {
  return (
    <div
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
    />
  )
}

function Skeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3" style={{ height: ROW_H }}>
          <div
            className="bg-muted/40 rounded animate-pulse shrink-0"
            style={{ width: LABEL_W - 24, height: 8 }}
          />
          <div className="flex gap-px flex-1">
            {Array.from({ length: 60 }).map((_, j) => (
              <div
                key={j}
                className="flex-1 bg-muted/10 rounded-sm animate-pulse"
                style={{ height: ROW_H - 8 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelineRow({ monitor }: { monitor: Monitor }) {
  const { heartbeats } = useHeartbeats(monitor.id, 120)
  return (
    <Link
      href={`/monitors/${monitor.id}`}
      className="flex items-stretch group"
      style={{ height: ROW_H }}
    >
      <div
        className="sticky left-0 z-10 shrink-0 bg-background group-hover:bg-muted/30 transition-colors flex items-center px-3 text-xs font-medium text-muted-foreground group-hover:text-foreground truncate border-r border-border/40"
        style={{ width: LABEL_W }}
      >
        {monitor.name}
      </div>
      <div className="flex items-stretch">
        {heartbeats.map((beat, i) => (
          <Beat key={i} status={beat.status} />
        ))}
      </div>
    </Link>
  )
}

export function IncidentTimeline({ monitors, className }: IncidentTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasMonitors = monitors.length > 0

  useEffect(() => {
    if (scrollRef.current && hasMonitors) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [hasMonitors])

  return (
    <div className={cn('relative overflow-hidden bg-card border-b border-border max-h-48 md:max-h-none overflow-y-auto', className)}>
      {!hasMonitors ? (
        <Skeleton />
      ) : (
        <>
          <div ref={scrollRef} className="overflow-x-auto scroll-smooth">
            <div
              className="relative divide-y divide-border/20"
              style={{ width: CONTENT_W, paddingRight: 16 }}
            >
              {monitors.map((monitor) => (
                <TimelineRow key={monitor.id} monitor={monitor} />
              ))}
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 w-px bg-foreground/15 pointer-events-none z-20">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/25 whitespace-nowrap select-none">
              now
            </span>
          </div>
        </>
      )}
    </div>
  )
}
