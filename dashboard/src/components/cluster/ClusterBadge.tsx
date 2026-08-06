'use client'

import Link from 'next/link'
import { Crown } from 'lucide-react'
import { useCluster } from '@/lib/cluster'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function heartbeatAge(lastHeartbeat: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000))
  if (s < 1) return '<1s'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

export function ClusterBadge() {
  const { online, offline, leader, term, healthy, lastError } = useCluster()

  const tone = lastError
    ? 'alarm'
    : leader
      ? 'signal'
      : 'gold'

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/cluster"
              className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-background px-2.5 font-mono text-xs text-foreground transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          }
        >
          <span className="relative flex size-2">
            {leader && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60" />
            )}
            <span
              className={cn(
                'relative inline-flex size-2 rounded-full',
                tone === 'signal' && 'bg-signal',
                tone === 'alarm' && 'bg-alarm',
                tone === 'gold' && 'bg-gold',
              )}
            />
          </span>
          <span className="tabular-nums">
            {online.length}/{online.length + offline.length}
          </span>
          {leader ? (
            <>
              <Crown className="size-3.5 text-gold" />
              <span>{leader.id}</span>
              {term != null && <span className="text-tick">t{term}</span>}
            </>
          ) : (
            <span className="text-tick">{lastError ? 'offline' : 'electing…'}</span>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="min-w-56 font-mono text-xs">
          <div className="space-y-1.5">
            {[...online, ...offline].map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      w.isOnline ? 'bg-signal' : 'bg-alarm',
                    )}
                  />
                  {w.id}
                </span>
                <span className="text-tick">
                  {w.isOnline
                    ? `${w.isLeader ? 'leader' : 'follower'} · hb ${heartbeatAge(w.lastHeartbeat)}`
                    : 'offline'}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
