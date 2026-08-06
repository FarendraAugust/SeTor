'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAccessToken, monitorsApi, getWorkerUrl } from '@/lib/api'
import type { Heartbeat } from '@/types/monitor'

export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    fetcher()
      .then(result => {
        if (!active) return
        setData(result)
        setError(null)
        setLoading(false)
      })
      .catch(e => {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Request failed')
        setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => {
    setLoading(true)
    setVersion(v => v + 1)
  }, [])

  return { data, loading, error, reload }
}

export function useHeartbeats(monitorId: string, limit = 120) {
  const { data, loading, reload } = useApiData<Heartbeat[]>(() => monitorsApi.heartbeats(monitorId, limit), [monitorId, limit])
  return { heartbeats: data ?? [], loading, reload }
}

interface BusEvent {
  type: string
  data: {
    targetId: number
    targetName: string
    status: string
    responseTime: number
    statusCode?: number | null
    error?: string | null
    checkedAt: string
  }
  source: string
  timestamp: number
}

export function useMonitoringEvents(onEvent: (event: BusEvent) => void) {
  useEffect(() => {
    let active = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let controller: AbortController | null = null

    const connect = async () => {
      const token = getAccessToken()
      if (!token) return
      controller = new AbortController()
      try {
        const res = await fetch(`${getWorkerUrl()}/dashboard/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!active || !res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const read = async (): Promise<void> => {
          while (active) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let idx: number
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
              const raw = buffer.slice(0, idx)
              buffer = buffer.slice(idx + 2)
              const line = raw.split('\n').find(l => l.startsWith('data:'))
              if (!line) continue
              try {
                const parsed = JSON.parse(line.slice(5).trim())
                onEvent(parsed)
              } catch {
                // ignore malformed events
              }
            }
          }
        }

        await read()
      } catch {
        // stream aborted or network error
      } finally {
        if (active) {
          retryTimer = setTimeout(connect, 5000)
        }
      }
    }

    void connect()

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      controller?.abort()
    }
  }, [onEvent])
}
