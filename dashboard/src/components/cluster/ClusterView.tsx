'use client'

import { Crown, RefreshCw, RadioTower } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useCluster } from '@/lib/cluster'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function hbAge(lastHeartbeat: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000))
  return s < 1 ? '<1s' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

const ROLE_LABEL: Record<string, { label: string; tone: string }> = {
  leader: { label: 'ON WATCH', tone: 'text-gold border-gold/40 bg-gold/10' },
  follower: { label: 'ON STANDBY', tone: 'text-signal border-signal/40 bg-signal/10' },
  offline: { label: 'OFFLINE', tone: 'text-alarm border-alarm/40 bg-alarm/10' },
}

const FEED_TONE: Record<string, string> = {
  elected: 'text-gold',
  handoff: 'text-gold',
  offline: 'text-alarm',
  online: 'text-signal',
  term: 'text-tick',
  note: 'text-tick',
  error: 'text-alarm',
}

function Readout() {
  const { feed } = useCluster()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (el) el.scrollTop = 0
  }, [feed.length])

  return (
    <section
      aria-label="Cluster event readout"
      className="overflow-hidden rounded-xl border border-border bg-background font-mono text-xs"
    >
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-1.5 text-[0.65rem] tracking-[0.18em] text-tick uppercase">
        <span className="flex items-center gap-1.5">
          <RadioTower className="size-3" />
          readout
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-signal" />
          live · poll 5s
        </span>
      </div>
      <div ref={boxRef} className="h-40 space-y-1 overflow-y-auto p-3 motion-reduce:overflow-hidden">
        {feed.length === 0 && (
          <p className="text-tick">
            <span className="text-signal">$</span> waiting for the first heartbeat…
          </p>
        )}
        {feed.map((e, i) => (
          <p
            key={e.id}
            className={cn(
              'animate-fade-in leading-5',
              i > 8 && 'opacity-70',
              i > 18 && 'opacity-40',
            )}
          >
            <span className="text-tick">{e.at.toLocaleTimeString('en-GB', { hour12: false })}</span>{' '}
            <span className={FEED_TONE[e.kind]}>{e.text}</span>
          </p>
        ))}
      </div>
    </section>
  )
}

function Led({ alive, leader }: { alive: boolean; leader: boolean }) {
  return (
    <span className="relative flex size-3">
      {alive && leader && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-50 motion-reduce:animate-none" />
      )}
      {alive && !leader && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-40 motion-reduce:animate-none" />
      )}
      <span
        className={cn(
          'relative inline-flex size-3 rounded-full',
          alive && leader && 'bg-gold',
          alive && !leader && 'bg-signal',
          !alive && 'bg-alarm',
        )}
      />
    </span>
  )
}

function NodePanel({
  id,
  publicUrl,
  term,
  electedAt,
  lastHeartbeat,
  isOnline,
  isLeader,
  isOnly,
}: {
  id: string
  publicUrl: string
  term: number
  electedAt: string | null
  lastHeartbeat: string
  isOnline: boolean
  isLeader: boolean
  isOnly: boolean
}) {
  const role = !isOnline ? 'offline' : isLeader ? 'leader' : 'follower'
  const roleCfg = ROLE_LABEL[role]

  return (
    <div
      className={cn(
        'relative flex-1 rounded-xl border bg-card p-4 transition-colors',
        isLeader && isOnline ? 'border-gold/40' : 'border-border',
        isOnly && 'border-dashed',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Led alive={isOnline} leader={isLeader} />
          <h3 className="truncate font-mono text-sm font-semibold">{id}</h3>
        </div>
        <Badge className={cn('rounded-full font-mono text-[0.65rem]', roleCfg.tone)}>
          {isLeader && isOnline && <Crown className="size-3" />}
          {roleCfg.label}
        </Badge>
      </div>

      <dl className="mt-4 space-y-1.5 font-mono text-xs">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tick">term</dt>
          <dd className="tabular-nums">{isOnline ? term : '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tick">url</dt>
          <dd className="truncate text-muted-foreground">{publicUrl.replace(/^https?:\/\//, '')}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tick">heartbeat</dt>
          <dd className={cn('tabular-nums', !isOnline && 'text-alarm')}>
            {isOnline ? `${hbAge(lastHeartbeat)} ago` : 'lost'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tick">elected</dt>
          <dd className="tabular-nums text-muted-foreground">
            {electedAt ? new Date(electedAt).toLocaleTimeString('en-GB', { hour12: false }) : '—'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function Connector({ alive, leader }: { alive: boolean; leader: boolean }) {
  return (
    <div className="hidden items-center px-3 sm:flex" aria-hidden>
      <div
        className={cn(
          'h-px w-10',
          alive
            ? 'bg-gradient-to-r from-signal/60 via-gold/60 to-signal/60'
            : 'bg-border',
        )}
      />
      <span
        className={cn(
          'size-1.5 rounded-full',
          alive ? (leader ? 'bg-gold' : 'bg-signal') : 'bg-border',
        )}
      />
      <div
        className={cn(
          'h-px w-10',
          alive
            ? 'bg-gradient-to-r from-signal/60 via-gold/60 to-signal/60'
            : 'bg-border',
        )}
      />
    </div>
  )
}

export function ClusterView() {
  const cluster = useCluster()
  const { workers, online, leader, term, healthy, lastError, polling, refresh } = cluster

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.22em] text-tick uppercase">
          cluster · {workers.length} node{workers.length === 1 ? '' : 's'}
          {leader && (
            <>
              <span className="text-border">·</span>
              <span className="text-gold">leader {leader.id}</span>
            </>
          )}
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight">
          {leader ? (
            <>
              <span className="text-gold">“{leader.id}”</span> is on watch.
            </>
          ) : lastError ? (
            'No worker is reachable.'
          ) : (
            'Electing a leader…'
          )}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          The fleet picks one worker to hold the term. The rest keep checking, sync
          their results, and take over the watch when it falls.
        </p>
      </header>

      <Readout />

      <section aria-label="Workers" className="flex flex-col gap-3 sm:flex-row">
        {workers.length === 0 && !lastError && (
          <>
            <Skeleton className="h-40 flex-1" />
            <Skeleton className="hidden h-40 flex-1 sm:block" />
          </>
        )}
        {workers.map((w, i) => (
          <Fragment key={w.id}>
            {i > 0 && workers.length > 1 && (
              <Connector alive={online.length > 0} leader={leader != null} />
            )}
            <NodePanel
              id={w.id}
              publicUrl={w.publicUrl}
              term={w.term}
              electedAt={w.electedAt}
              lastHeartbeat={w.lastHeartbeat}
              isOnline={w.isOnline}
              isLeader={w.isLeader}
              isOnly={workers.length === 1}
            />
          </Fragment>
        ))}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <p className="font-mono text-xs text-tick">
          quorum <span className={cn(healthy ? 'text-signal' : 'text-alarm')}>{online.length}/{workers.length}</span>
          {' · '}hb 5s · config 5s · results 15s
        </p>
        <div className="flex items-center gap-2">
          {lastError && (
            <p className="font-mono text-[0.7rem] text-alarm">
              poll failed: {lastError}
            </p>
          )}
          <Button variant="outline" size="xs" onClick={refresh} disabled={polling}>
            <RefreshCw className={cn('size-3.5', polling && 'animate-spin')} />
            refresh
          </Button>
        </div>
      </footer>
    </div>
  )
}
