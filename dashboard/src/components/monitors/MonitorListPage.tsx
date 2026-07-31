'use client'

import { MonitorList } from './MonitorList'
import { useApiData } from '@/hooks/useApi'
import { monitorsApi } from '@/lib/api'
import type { Monitor } from '@/types/monitor'

export function MonitorListPage() {
  const { data: fetchedMonitors, loading, reload } = useApiData<Monitor[]>(() => monitorsApi.list(), [])
  const { data: fetchedTags, reload: reloadTags } = useApiData<string[]>(() => monitorsApi.tags(), [])

  const monitors = fetchedMonitors ?? []
  const allTags = fetchedTags ?? []

  const handleMonitorsChange = () => {
    reload()
    reloadTags()
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {loading && monitors.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <MonitorList monitors={monitors} allTags={allTags} showAddButton={true} onMonitorsChange={handleMonitorsChange} />
      )}
    </div>
  )
}
