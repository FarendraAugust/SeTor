'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PublicStatusPage } from '@/components/status-page/PublicStatusPage'
import { statusPagesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import type { StatusPage, Monitor, Heartbeat } from '@/types/monitor'

interface PublicData {
  statusPage: StatusPage
  monitors: Monitor[]
  heartbeats: Record<string, Heartbeat[]>
  uptimes: Record<string, Record<string, number>>
}

export default function StatusPageDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [data, setData] = useState<PublicData | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    void params.then(p => setId(p.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        const sp = await statusPagesApi.get(id)
        const publicData = await statusPagesApi.publicBySlug(sp.slug)
        if (mounted) setData(publicData)
      } catch {
        if (mounted) setNotFound(true)
      }
    })()
    return () => { mounted = false }
  }, [id])

  if (notFound) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Status page not found</p>
        <Link href="/status-pages">
          <Button variant="outline" className="mt-4">Back to Status Pages</Button>
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto py-8">
        <div className="h-8 w-64 mx-auto rounded bg-muted/40 animate-pulse" />
        <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    )
  }

  return (
    <PublicStatusPage
      statusPage={data.statusPage}
      monitors={data.monitors}
      heartbeats={data.heartbeats}
      uptimes={data.uptimes}
    />
  )
}
