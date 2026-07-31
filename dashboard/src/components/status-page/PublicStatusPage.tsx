'use client'

import { useState, useMemo } from 'react'
import { cn, formatUptime, formatMs } from '@/lib/utils'
import type { StatusPage, Heartbeat, Monitor } from '@/types/monitor'
import type { Status } from '@/types/common'

interface PublicStatusPageProps {
  statusPage: StatusPage
  monitors: Monitor[]
  heartbeats: Record<string, Heartbeat[]>
  uptimes?: Record<string, Record<string, number>>
}

function Sparkline({ heartbeats }: { heartbeats: Heartbeat[] }) {
  const height = 24
  const width = 120
  const barWidth = width / Math.max(heartbeats.length, 1)

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      {heartbeats.map((hb, i) => (
        <rect
          key={i}
          x={i * barWidth}
          y={0}
          width={Math.max(barWidth - 0.5, 1)}
          height={height}
          fill={
            hb.status === 'up' ? 'var(--up)'
            : hb.status === 'down' ? 'var(--down)'
            : 'var(--pending)'
          }
          rx={0.5}
        />
      ))}
    </svg>
  )
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-block size-2.5 rounded-full',
        status === 'up' && 'bg-[var(--up)]',
        status === 'down' && 'bg-[var(--down)]',
        status === 'pending' && 'bg-[var(--pending)]',
        status === 'unknown' && 'bg-muted-foreground',
      )}
    />
  )
}

function OverallStatusBadge({ status }: { status: 'operational' | 'degraded' | 'down' }) {
  const config = {
    operational: {
      className: 'bg-[var(--up)]/10 text-[var(--up)] ring-[var(--up)]/20',
      dot: 'bg-[var(--up)]',
      label: 'All Systems Operational',
    },
    degraded: {
      className: 'bg-[var(--pending)]/10 text-[var(--pending)] ring-[var(--pending)]/20',
      dot: 'bg-[var(--pending)]',
      label: 'Degraded Performance',
    },
    down: {
      className: 'bg-[var(--down)]/10 text-[var(--down)] ring-[var(--down)]/20',
      dot: 'bg-[var(--down)]',
      label: 'Service Disruption',
    },
  }[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1',
        config.className,
      )}
    >
      <span className={cn('inline-block size-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

export function PublicStatusPage({ statusPage, monitors, heartbeats, uptimes = {} }: PublicStatusPageProps) {
  const [uptimePeriod, setUptimePeriod] = useState<string>('90d')

  const overallStatus = useMemo(() => {
    if (monitors.length === 0) return 'operational' as const
    if (monitors.every(m => m.status === 'up')) return 'operational' as const
    if (monitors.every(m => m.status === 'down')) return 'down' as const
    return 'degraded' as const
  }, [monitors])

  const incidents = useMemo(() => {
    const all: { monitorName: string; date: string; duration: string }[] = []
    for (const monitor of monitors) {
      const beats = heartbeats[monitor.id] || []
      let downStart: string | null = null
      let downCount = 0
      for (const beat of beats) {
        if (beat.status === 'down' && !downStart) {
          downStart = beat.time
          downCount = 1
        } else if (beat.status === 'down' && downStart) {
          downCount++
        } else if (beat.status !== 'down' && downStart) {
          const mins = downCount
          all.push({
            monitorName: monitor.name,
            date: downStart,
            duration: mins >= 60
              ? `${Math.floor(mins / 60)}h ${mins % 60}m`
              : `${mins}m`,
          })
          downStart = null
          downCount = 0
        }
      }
    }
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [monitors, heartbeats])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {statusPage.title}
          </h1>
          {statusPage.description && (
            <p className="mt-1 text-sm text-muted-foreground">{statusPage.description}</p>
          )}
          <div className="mt-4 flex justify-center sm:justify-start">
            <OverallStatusBadge status={overallStatus} />
          </div>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Services
          </h2>
          <div className="divide-y divide-border rounded-xl border bg-card">
            {monitors.length > 0 ? (
              monitors.map(monitor => {
                const periodUptime = uptimes[monitor.id]?.[uptimePeriod] ?? monitor.uptime
                return (
                  <div key={monitor.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <StatusDot status={monitor.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{monitor.name}</p>
                    </div>
                    <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
                      <span className="tabular-nums">{formatUptime(periodUptime)}</span>
                      <span className="tabular-nums">
                        {monitor.status === 'down' ? '—' : formatMs(monitor.responseTime)}
                      </span>
                    </div>
                    <Sparkline heartbeats={heartbeats[monitor.id]?.slice(-60) || []} />
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No services configured for this status page.
              </div>
            )}
          </div>
        </section>

        {statusPage.showUptime !== false && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Uptime History
            </h2>
            <div className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="mb-4 flex gap-1.5">
                {['24h', '7d', '30d', '90d'].map(period => (
                  <button
                    key={period}
                    onClick={() => setUptimePeriod(period)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      uptimePeriod === period
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {monitors.map(monitor => {
                  const uptime = uptimes[monitor.id]?.[uptimePeriod] ?? monitor.uptime
                  return (
                    <div key={monitor.id} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-sm text-foreground">
                        {monitor.name}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              uptime >= 99.9 && 'bg-[var(--up)]',
                              uptime >= 99 && uptime < 99.9 && 'bg-[var(--pending)]',
                              uptime < 99 && 'bg-[var(--down)]',
                            )}
                            style={{ width: `${uptime}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {formatUptime(uptime)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {statusPage.showHistory !== false && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Incident History
            </h2>
            {incidents.length > 0 ? (
              <div className="divide-y divide-border rounded-xl border bg-card">
                {incidents.slice(0, 10).map((incident, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <span className="mt-0.5 inline-block size-2 shrink-0 rounded-full bg-[var(--down)]" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {incident.monitorName}{' '}
                        <span className="font-normal text-muted-foreground">
                          — Down for {incident.duration}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(incident.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                No recent incidents
              </div>
            )}
          </section>
        )}

        <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Powered by <span className="font-medium text-foreground">UBIG Monitoring</span>
        </footer>
      </div>
    </div>
  )
}
