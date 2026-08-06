'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { X, Plus, Copy, Check, Bell } from 'lucide-react'
import { MONITOR_TYPES, DEFAULT_MONITOR_INTERVAL, DEFAULT_MONITOR_TIMEOUT, DEFAULT_MONITOR_RETRIES } from '@/lib/constants'
import { providerIconMap } from '@/components/notifications/provider-icons'
import type { MonitorType } from '@/types/common'
import { monitorsApi, notificationsApi, type MonitorInput } from '@/lib/api'
import type { Monitor, NotificationProvider } from '@/types/monitor'
import { cn } from '@/lib/utils'

const HTTP_TYPES: MonitorType[] = ['http', 'keyword']
const TLS_TYPES: MonitorType[] = ['http', 'keyword', 'websocket']

function generatePushToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = 'pt-'
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

const DEFAULT_STATE = {
  type: 'http' as MonitorType,
  name: '',
  url: '',
  interval: DEFAULT_MONITOR_INTERVAL,
  timeout: DEFAULT_MONITOR_TIMEOUT,
  retries: DEFAULT_MONITOR_RETRIES,
  maxRedirects: 10,
  ignoreTls: false,
  upsideDown: false,
  tags: [] as string[],
  jsonQueryPath: '',
  expectedValue: '',
  steamGameId: '',
  dockerContainer: '',
  dockerHost: 'unix:///var/run/docker.sock',
  selectedProviders: [] as string[],
  active: true,
  notificationThreshold: '',
  resendNotification: false,
  notificationInterval: '60',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  monitorId?: string
  onSaved?: () => void
}

export function MonitorFormDialog({ open, onOpenChange, monitorId, onSaved }: Props) {
  const isEdit = !!monitorId
  const [loading, setLoading] = useState(isEdit)
  const [type, setType] = useState<MonitorType>(DEFAULT_STATE.type)
  const [name, setName] = useState(DEFAULT_STATE.name)
  const [url, setUrl] = useState(DEFAULT_STATE.url)
  const [interval, setInterval] = useState(DEFAULT_STATE.interval)
  const [timeout, setTimeout_] = useState(DEFAULT_STATE.timeout)
  const [retries, setRetries] = useState(DEFAULT_STATE.retries)
  const [maxRedirects, setMaxRedirects] = useState(DEFAULT_STATE.maxRedirects)
  const [ignoreTls, setIgnoreTls] = useState(DEFAULT_STATE.ignoreTls)
  const [upsideDown, setUpsideDown] = useState(DEFAULT_STATE.upsideDown)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(DEFAULT_STATE.tags)
  const [jsonQueryPath, setJsonQueryPath] = useState(DEFAULT_STATE.jsonQueryPath)
  const [expectedValue, setExpectedValue] = useState(DEFAULT_STATE.expectedValue)
  const [pushToken, setPushToken] = useState(generatePushToken)
  const [steamGameId, setSteamGameId] = useState(DEFAULT_STATE.steamGameId)
  const [dockerContainer, setDockerContainer] = useState(DEFAULT_STATE.dockerContainer)
  const [dockerHost, setDockerHost] = useState(DEFAULT_STATE.dockerHost)
  const [selectedProviders, setSelectedProviders] = useState<string[]>(DEFAULT_STATE.selectedProviders)
  const [notificationThreshold, setNotificationThreshold] = useState(DEFAULT_STATE.notificationThreshold)
  const [resendNotification, setResendNotification] = useState(DEFAULT_STATE.resendNotification)
  const [notificationInterval, setNotificationInterval] = useState(DEFAULT_STATE.notificationInterval)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [providers, setProviders] = useState<NotificationProvider[]>([])
  const [active, setActive] = useState(DEFAULT_STATE.active)
  const [orig, setOrig] = useState<Monitor | null>(null)

  useEffect(() => {
    notificationsApi.list().then(setProviders).catch(() => {})
  }, [])

  useEffect(() => {
    if (!monitorId) return
    let cancelled = false
    monitorsApi.get(monitorId)
      .then((m) => {
        if (cancelled) return
        setOrig(m)
        setType(m.type)
        setName(m.name)
        setUrl(m.type === 'push' ? '' : m.url)
        setInterval(m.interval)
        setTimeout_(m.timeout)
        setRetries(m.retries ?? 0)
        setMaxRedirects(m.maxredirects ?? 10)
        setIgnoreTls(m.ignoreTls ?? false)
        setUpsideDown(m.upsideDown ?? false)
        setTags(m.tags ?? [])
        setSelectedProviders(m.notificationIds ?? [])
        setNotificationThreshold(m.notificationThreshold ? String(m.notificationThreshold) : '')
        setResendNotification(m.resendNotification ?? false)
        setNotificationInterval(m.notificationInterval ? String(m.notificationInterval) : '60')
        setJsonQueryPath(m.jsonQuery ?? '')
        setExpectedValue(m.expectedValue ?? '')
        setSteamGameId(m.steamGameId ?? '')
        setDockerContainer(m.dockerContainer ?? '')
        setActive(m.active)
        if (m.type === 'push') {
          setPushToken(m.url.replace('push://', ''))
        }
      })
      .catch(() => {
        if (!cancelled) setSubmitError('Failed to load monitor')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [monitorId])

  const isHttpType = HTTP_TYPES.includes(type)
  const isTlsType = TLS_TYPES.includes(type)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  const toggleProvider = (id: string) => {
    setSelectedProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const urlLabel = () => {
    switch (type) {
      case 'http':
      case 'keyword':
      case 'json-query':
        return 'URL'
      case 'ping':
        return 'Hostname / IP'
      case 'tcp':
        return 'Host:Port'
      case 'dns':
        return 'Query'
      case 'websocket':
        return 'URL'
      case 'push':
        return 'Push Token'
      case 'steam':
        return 'Game Server IP:Port'
      case 'docker':
        return 'Container Name / ID'
      default:
        return 'Target'
    }
  }

  const urlPlaceholder = () => {
    switch (type) {
      case 'http':
        return 'https://example.com'
      case 'ping':
        return '8.8.8.8'
      case 'tcp':
        return 'example.com:443'
      case 'dns':
        return 'example.com'
      case 'websocket':
        return 'wss://example.com'
      case 'json-query':
        return 'https://api.example.com/data'
      case 'steam':
        return '192.168.1.1:27015'
      case 'docker':
        return 'container_name'
      default:
        return ''
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    if (type !== 'push' && !url.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const prev = orig
      const input: MonitorInput = {
        name: name.trim(),
        url: type === 'push' ? `push://${pushToken}` : url.trim(),
        type,
        interval,
        timeout,
        retries,
        tags,
        enabled: isEdit ? active : true,
        maxRedirects: isHttpType ? maxRedirects : undefined,
        ignoreTls: isTlsType ? ignoreTls : undefined,
        upsideDown,
        notificationIds: selectedProviders,
        notificationThreshold: notificationThreshold.trim() ? Number(notificationThreshold) : null,
        resendNotification,
        notificationInterval: notificationInterval.trim() ? Number(notificationInterval) : null,
        jsonQuery: type === 'json-query' ? (jsonQueryPath || null) : (prev?.jsonQuery ?? null),
        expectedValue: type === 'keyword' || type === 'json-query' ? (expectedValue || null) : (prev?.expectedValue ?? null),
        steamGameId: type === 'steam' ? (steamGameId || null) : (prev?.steamGameId ?? null),
        dockerContainer: type === 'docker' ? (dockerContainer || url.trim()) : (prev?.dockerContainer ?? null),
        pushToken: type === 'push' ? pushToken : (prev?.pushToken ?? null),
      }
      if (isEdit && monitorId) {
        await monitorsApi.update(monitorId, input)
      } else {
        await monitorsApi.create(input)
      }
      onSaved?.()
      onOpenChange(false)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Monitor' : 'Add Monitor'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the monitor configuration.'
              : 'Configure a new monitor to start tracking.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="h-40 rounded-lg bg-muted/40 animate-pulse" />
            <div className="h-40 rounded-lg bg-muted/40 animate-pulse" />
            <div className="h-10 w-40 rounded bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Monitor Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">Monitor Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MONITOR_TYPES.map(mt => (
                      <button
                        key={mt.value}
                        type="button"
                        onClick={() => setType(mt.value as MonitorType)}
                        className={`px-3 py-2 rounded-lg text-sm border text-left transition-colors ${
                          type === mt.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-input bg-background text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {mt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Friendly Name</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="My Monitor"
                  />
                </div>

                {type === 'push' ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Push Token</label>
                      <div className="flex gap-2">
                        <Input value={pushToken} readOnly className="font-mono text-xs" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(pushToken)}
                          className="shrink-0"
                        >
                          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Push URL</label>
                      <Input
                        value={`${baseUrl}/api/push/${pushToken}`}
                        readOnly
                        className="font-mono text-xs text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        Send a GET request to this URL to report an UP status, or a POST with status=down to report a DOWN status.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">{urlLabel()}</label>
                    <Input
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder={urlPlaceholder()}
                    />
                  </div>
                )}

                {type === 'json-query' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">JSON Query Path</label>
                      <Input
                        value={jsonQueryPath}
                        onChange={e => setJsonQueryPath(e.target.value)}
                        placeholder="e.g. $.status or data[0].value"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Expected Value</label>
                      <Input
                        value={expectedValue}
                        onChange={e => setExpectedValue(e.target.value)}
                        placeholder="e.g. ok or 200"
                      />
                    </div>
                  </>
                )}

                {type === 'keyword' && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Expected Keyword</label>
                    <Input
                      value={expectedValue}
                      onChange={e => setExpectedValue(e.target.value)}
                      placeholder="e.g. healthy"
                    />
                  </div>
                )}

                {type === 'steam' && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Steam Game ID</label>
                    <Input
                      value={steamGameId}
                      onChange={e => setSteamGameId(e.target.value)}
                      placeholder="e.g. 730 (CS:GO) or 440 (TF2)"
                    />
                  </div>
                )}

                {type === 'docker' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Container Name / ID</label>
                      <Input
                        value={dockerContainer}
                        onChange={e => setDockerContainer(e.target.value)}
                        placeholder="container_name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Docker Host</label>
                      <Input
                        value={dockerHost}
                        onChange={e => setDockerHost(e.target.value)}
                        placeholder="unix:///var/run/docker.sock"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Interval (seconds)</label>
                    <Input
                      type="number"
                      value={interval}
                      onChange={e => setInterval(Number(e.target.value))}
                      min={10}
                      max={3600}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Timeout (seconds)</label>
                    <Input
                      type="number"
                      value={timeout}
                      onChange={e => setTimeout_(Number(e.target.value))}
                      min={1}
                      max={300}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Retries</label>
                    <Input
                      type="number"
                      value={retries}
                      onChange={e => setRetries(Number(e.target.value))}
                      min={0}
                      max={10}
                    />
                  </div>
                </div>

                {isHttpType && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Max Redirects</label>
                    <Input
                      type="number"
                      value={maxRedirects}
                      onChange={e => setMaxRedirects(Number(e.target.value))}
                      min={0}
                      max={20}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  {isTlsType && (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ignoreTls}
                        onChange={e => setIgnoreTls(e.target.checked)}
                        className="size-4 rounded border-input text-primary accent-primary"
                      />
                      <span>Ignore TLS errors</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={upsideDown}
                      onChange={e => setUpsideDown(e.target.checked)}
                      className="size-4 rounded border-input text-primary accent-primary"
                    />
                    <span>Upside down mode (treat UP as DOWN and vice versa)</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Tags</label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                      placeholder="Add tag..."
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-destructive transition-colors">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Providers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {providers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notification providers configured.</p>
                ) : (
                  <div className="space-y-2">
                    {providers.map(provider => {
                      const ProviderIcon = providerIconMap[provider.type] ?? Bell
                      return (
                        <label
                          key={provider.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-input bg-background hover:bg-secondary/50 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProviders.includes(provider.id)}
                            onChange={() => toggleProvider(provider.id)}
                            className="size-4 rounded border-input text-primary accent-primary"
                          />
                          <ProviderIcon className="size-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{provider.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{provider.type}</div>
                          </div>
                          {!provider.active && (
                            <Badge variant="outline" className="text-xs">Disabled</Badge>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-1.5 pt-1 border-t border-border/50">
                  <label className="block text-sm font-medium">Alert setelah N kali down berturut-turut</label>
                  <Input
                    type="number"
                    min={1}
                    value={notificationThreshold}
                    onChange={e => setNotificationThreshold(e.target.value)}
                    placeholder="1 (langsung)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kirim notifikasi hanya setelah target down selama N siklus check berturut-turut.
                    Contoh: 3 = alert pada kegagalan ke-3 (mengurangi false-positive).
                    Kosongkan = langsung alert saat pertama down.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={resendNotification}
                    onChange={e => setResendNotification(e.target.checked)}
                    className="size-4 rounded border-input text-primary accent-primary"
                  />
                  <span className="text-sm font-medium">Kirim ulang notifikasi saat masih down</span>
                </label>

                {resendNotification && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Interval resend (detik)</label>
                    <Input
                      type="number"
                      min={10}
                      value={notificationInterval}
                      onChange={e => setNotificationInterval(e.target.value)}
                      placeholder="60"
                    />
                    <p className="text-xs text-muted-foreground">
                      Selama target masih down, notifikasi dikirim ulang setiap interval ini.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {submitError && (
              <div className={cn('rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive')}>
                {submitError}
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Monitor')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
