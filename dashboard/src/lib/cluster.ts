'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { workerApi } from '@/lib/api'
import type { WorkerRow } from '@/types/worker'

export interface FeedEntry {
  id: number
  at: Date
  text: string
  kind: 'elected' | 'handoff' | 'offline' | 'online' | 'term' | 'note' | 'error'
}

export interface ClusterState {
  workers: WorkerRow[]
  online: WorkerRow[]
  offline: WorkerRow[]
  leader: WorkerRow | null
  term: number | null
  healthy: boolean
  polling: boolean
  feed: FeedEntry[]
  lastError: string | null
  refresh: () => void
}

const POLL_MS = 5_000
const FEED_LIMIT = 60

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour12: false })
}

export function useCluster(): ClusterState {
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [polling, setPolling] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const prevRef = useRef<Map<string, WorkerRow>>(new Map())
  const feedId = useRef(0)

  const push = useCallback((at: Date, text: string, kind: FeedEntry['kind']) => {
    setFeed((f) => [{ id: ++feedId.current, at, text, kind }, ...f].slice(0, FEED_LIMIT))
  }, [])

  const refresh = useCallback(async () => {
    setPolling(true)
    try {
      const { workers: rows } = await workerApi.list()
      setLastError(null)
      const prev = prevRef.current
      const next = new Map<string, WorkerRow>()
      const now = Date.now()
      const events: Array<{ text: string; kind: FeedEntry['kind'] }> = []

      for (const w of rows) {
        next.set(w.id, w)
        const p = prev.get(w.id)
        if (!p) {
          events.push({ text: `${w.id} joined the cluster · ${w.publicUrl}`, kind: 'online' })
          continue
        }
        if (!p.isOnline && w.isOnline) {
          events.push({ text: `${w.id} came online · heartbeat resumed`, kind: 'online' })
        }
        if (p.isOnline && !w.isOnline) {
          events.push({ text: `${w.id} stopped responding · heartbeat lost`, kind: 'offline' })
        }
        if (w.isLeader && !p.isLeader) {
          events.push({
            text: w.isOnline
              ? `${w.id} elected leader · term ${w.term} · quorum ${rows.filter((r) => r.isOnline).length}/${rows.length}`
              : `${w.id} claimed leadership · term ${w.term} (no heartbeat)`,
            kind: 'elected',
          })
        }
        if (w.term > p.term) {
          events.push({ text: `${w.id} term ${p.term} → ${w.term}`, kind: 'term' })
        }
      }

      for (const [id, p] of prev) {
        if (!next.has(id)) {
          events.push({ text: `${id} left the cluster`, kind: 'offline' })
        }
      }

      if (events.length > 0) {
        const stamp = new Date(now)
        for (const e of events) push(stamp, e.text, e.kind)
      }

      prevRef.current = next
      setWorkers(rows)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setLastError(msg)
      push(new Date(), `poll failed: ${msg}`, 'error')
    } finally {
      setPolling(false)
    }
  }, [push])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const online = workers.filter((w) => w.isOnline)
  const leader = workers.find((w) => w.isOnline && w.isLeader) ?? null

  return {
    workers,
    online,
    offline: workers.filter((w) => !w.isOnline),
    leader,
    term: leader?.term ?? (workers.length > 0 ? Math.max(...workers.map((w) => w.term)) : null),
    healthy: workers.length > 0 && online.length > 0 && !lastError,
    polling,
    feed,
    lastError,
    refresh,
  }
}
