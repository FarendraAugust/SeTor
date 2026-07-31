'use client'

import { useState, useMemo } from 'react'
import {
  Bell,
  Plus,
  Search,
  Trash2,
  FileText,
} from 'lucide-react'
import type { NotificationProvider, Monitor } from '@/types/monitor'
import { NOTIFICATION_PROVIDERS } from '@/lib/constants'
import { useApiData } from '@/hooks/useApi'
import { notificationsApi, monitorsApi } from '@/lib/api'
import { providerIconMap } from '@/components/notifications/provider-icons'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationForm } from '@/components/notifications/NotificationForm'
import { TestNotificationButton } from '@/components/notifications/TestNotificationButton'

const typeFilterOptions = [
  { value: 'all', label: 'All' },
  ...NOTIFICATION_PROVIDERS.map(p => ({ value: p.value, label: p.label })),
]

export function NotificationsPage() {
  const { data: fetchedProviders, reload } = useApiData<NotificationProvider[]>(() => notificationsApi.list(), [])
  const { data: fetchedMonitors } = useApiData<Monitor[]>(() => monitorsApi.list(true), [])
  const providers = fetchedProviders ?? []
  const monitors = fetchedMonitors ?? []
  const [searchType, setSearchType] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<NotificationProvider | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredProviders = useMemo(() => {
    const all = fetchedProviders ?? []
    if (searchType === 'all') return all
    return all.filter(p => p.type === searchType)
  }, [fetchedProviders, searchType])

  async function handleToggleActive(id: string) {
    const provider = providers.find(p => p.id === id)
    if (!provider) return
    try {
      await notificationsApi.update(id, { active: !provider.active })
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  async function handleDelete(id: string) {
    setBusy(true)
    setError(null)
    try {
      await notificationsApi.remove(id)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSave(provider: NotificationProvider) {
    setBusy(true)
    setError(null)
    try {
      if (editingProvider) {
        await notificationsApi.update(editingProvider.id, {
          name: provider.name,
          type: provider.type,
          config: provider.config,
          active: provider.active,
          applyTo: provider.applyTo,
        })
      } else {
        await notificationsApi.create({
          name: provider.name,
          type: provider.type,
          config: provider.config,
          active: provider.active,
          applyTo: provider.applyTo,
        })
      }
      setFormOpen(false)
      setEditingProvider(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  function handleEdit(provider: NotificationProvider) {
    setEditingProvider(provider)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditingProvider(null)
    setFormOpen(true)
  }

  const empty = filteredProviders.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure notification providers to alert your team.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="size-4" />
          Add Notification
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Search className="size-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1.5 flex-wrap">
          {typeFilterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSearchType(opt.value)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                searchType === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Bell className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {searchType !== 'all'
                ? 'No providers match this type.'
                : 'No notification providers configured yet. Add one to get started.'}
            </p>
            {searchType === 'all' && (
              <Button variant="outline" onClick={handleAdd}>
                <Plus className="size-4" />
                Add Notification
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredProviders.map(provider => {
            const providerDef = NOTIFICATION_PROVIDERS.find(p => p.value === provider.type)
            const Icon = providerDef ? (providerIconMap[providerDef.value] ?? Bell) : Bell
            const appliedMonitors = monitors.filter(m => (m.notificationIds ?? []).includes(provider.id))

            return (
              <Card key={provider.id} size="sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg',
                          provider.active
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate">{provider.name}</CardTitle>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">
                            {providerDef?.label || provider.type}
                          </Badge>
                          <span
                            className={cn(
                              'text-[10px] font-medium',
                              provider.active ? 'text-primary' : 'text-muted-foreground',
                            )}
                          >
                            {provider.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => void handleToggleActive(provider.id)}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        provider.active ? 'bg-primary' : 'bg-input',
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
                          provider.active ? 'translate-x-4' : 'translate-x-0',
                        )}
                      />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {appliedMonitors.length > 0 ? (
                      appliedMonitors.map(m => (
                        <Badge key={m.id} variant="secondary" className="text-[10px]">
                          {m.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No monitors using this provider yet — pick it in a monitor&apos;s form.
                      </span>
                    )}
                  </div>
                  {provider.customMessage && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                      <FileText className="size-3 shrink-0" />
                      <span className="truncate font-mono">{provider.customMessage}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-1 pt-1">
                    <TestNotificationButton provider={provider} />
                    <Button variant="ghost" size="xs" onClick={() => handleEdit(provider)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => void handleDelete(provider.id)}
                      disabled={busy}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {formOpen && (
        <NotificationForm
          provider={editingProvider}
          onSave={handleSave}
          onClose={() => {
            setFormOpen(false)
            setEditingProvider(null)
          }}
        />
      )}
    </div>
  )
}
