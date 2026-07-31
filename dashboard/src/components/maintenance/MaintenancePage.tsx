'use client'

import { useState, useMemo } from 'react'
import { SearchIcon, PlusIcon, ClockIcon, CalendarIcon, MonitorIcon, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MaintenanceForm } from './MaintenanceForm'
import { useApiData } from '@/hooks/useApi'
import { maintenanceApi, monitorsApi } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { MaintenanceWindow, Monitor } from '@/types/monitor'

export function MaintenancePage() {
  const { data: fetchedWindows, reload } = useApiData<MaintenanceWindow[]>(() => maintenanceApi.list(), [])
  const { data: fetchedMonitors } = useApiData<Monitor[]>(() => monitorsApi.list(true), [])
  const mockMonitors = fetchedMonitors ?? []
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const windows = fetchedWindows ?? []
    if (!search.trim()) return windows
    const q = search.toLowerCase()
    return windows.filter(w => w.title.toLowerCase().includes(q))
  }, [fetchedWindows, search])

  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  }, [filtered])

  async function handleCreate(data: Omit<MaintenanceWindow, 'id' | 'createdAt'>) {
    setBusy(true)
    setError(null)
    try {
      await maintenanceApi.create({
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        monitors: data.monitors,
        active: data.active,
      })
      setFormOpen(false)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    setBusy(true)
    setError(null)
    try {
      await maintenanceApi.remove(id)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Maintenance Windows</h1>
          <p className="text-sm text-muted-foreground">
            Schedule and manage planned maintenance for your monitors
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon />
          Schedule Maintenance
        </Button>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search maintenance..."
          className="pl-8"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClockIcon className="size-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium mb-1">
            {search ? 'No results found' : 'No maintenance windows'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {search
              ? 'Try adjusting your search query.'
              : 'Schedule your first maintenance window to inform your team about planned downtime.'}
          </p>
          {!search && (
            <Button onClick={() => setFormOpen(true)}>
              <PlusIcon />
              Schedule Maintenance
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(w => {
            const monitorNames = w.monitors
              .map(id => mockMonitors.find(m => m.id === id)?.name)
              .filter(Boolean) as string[]

            return (
              <Card
                key={w.id}
                className={cn(
                  'transition-opacity duration-200',
                  w.active && 'ring-primary/20'
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>
                      {w.title}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={w.active ? 'default' : 'ghost'}
                      >
                        {w.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(w.id)}
                        disabled={busy}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {w.description.length > 100
                      ? w.description.slice(0, 100) + '...'
                      : w.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    <span>
                      {formatDate(w.startTime)} – {formatDate(w.endTime)}
                    </span>
                  </div>
                  {monitorNames.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MonitorIcon className="size-3.5 shrink-0" />
                      <span>
                        {monitorNames.length}{' '}
                        {monitorNames.length === 1 ? 'monitor' : 'monitors'}:{' '}
                        {monitorNames.join(', ')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <MaintenanceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
