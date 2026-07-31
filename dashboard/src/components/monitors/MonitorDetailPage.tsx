'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useId } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './StatusBadge'
import { MonitorFormDialog } from './MonitorFormDialog'
import { HeartbeatTimeline } from '@/components/charts/HeartbeatTimeline'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { monitorsApi, notificationsApi } from '@/lib/api'
import { useApiData, useHeartbeats } from '@/hooks/useApi'
import { formatUptime, formatMs, formatDate, timeAgo, cn } from '@/lib/utils'
import { UPTIME_PERIODS } from '@/lib/constants'
import type { Monitor, NotificationProvider, Heartbeat } from '@/types/monitor'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Globe,
  Wifi,
  Plug,
  Search,
  FileText,
  Link2,
  Code,
  Upload,
  Gamepad2,
  HardDrive,
  Pause,
  Play,
  Bell,
  BellOff,
  AlertTriangle,
} from 'lucide-react'
import { providerIconMap } from '@/components/notifications/provider-icons'

const typeIcons: Record<string, typeof Globe> = {
  http: Globe,
  ping: Wifi,
  tcp: Plug,
  dns: Search,
  keyword: FileText,
  websocket: Link2,
  'json-query': Code,
  push: Upload,
  steam: Gamepad2,
  docker: HardDrive,
}

function ResponseTimeHistoryChart({ heartbeats }: { heartbeats: MonitorHeartbeat[] }) {
  const gradientId = useId()
  const valid = heartbeats.filter(b => b.responseTime > 0)
  if (valid.length < 2) return <p className="text-sm text-muted-foreground">Not enough data</p>

  const w = 600
  const h = 100
  const max = Math.max(...valid.map(b => b.responseTime))
  const min = Math.min(...valid.map(b => b.responseTime))
  const range = max - min || 1

  const points = valid
    .map((b, i) => {
      const x = (i / (valid.length - 1)) * w
      const y = h - ((b.responseTime - min) / range) * (h - 10) - 5
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const fillPoints = `0,${h} ${points} ${w},${h}`

  return (
    <>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        role="img"
        aria-label="Response time history chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill={`url(${gradientId})`} />
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {valid
          .filter((_, i) => i % Math.max(1, Math.floor(valid.length / 5)) === 0)
          .map((b, i) => {
            const idx = valid.indexOf(b)
            const x = (idx / (valid.length - 1)) * w
            return (
              <line
                key={i}
                x1={x}
                y1={0}
                x2={x}
                y2={h}
                stroke="var(--border)"
                strokeWidth={0.5}
                opacity={0.3}
              />
            )
          })}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
        <span>{Math.min(...valid.map(b => b.responseTime))}ms</span>
        <span>{Math.max(...valid.map(b => b.responseTime))}ms</span>
      </div>
    </>
  )
}

function ResponseTimeSparkline({ heartbeats, className }: { heartbeats: MonitorHeartbeat[]; className?: string }) {
  const gradientId = useId()
  const valid = heartbeats.filter(b => b.responseTime > 0)
  if (valid.length < 2) return null

  const w = 120
  const h = 32
  const max = Math.max(...valid.map(b => b.responseTime))
  const min = Math.min(...valid.map(b => b.responseTime))
  const range = max - min || 1

  const linePoints = valid
    .map((b, i) => {
      const x = (i / (valid.length - 1)) * w
      const y = h - ((b.responseTime - min) / range) * (h - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const fillPoints = `0,${h} ${linePoints} ${w},${h}`

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn('w-full h-auto', className)}
      role="img"
      aria-label="Response time sparkline"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(${gradientId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type MonitorHeartbeat = Heartbeat

interface MonitorDetailPageProps {
  id: string
}

export function MonitorDetailPage({ id }: MonitorDetailPageProps) {
  const router = useRouter()
  const { data: sourceMonitor, loading, reload } = useApiData<Monitor | null>(() => monitorsApi.get(id), [id])
  const { heartbeats } = useHeartbeats(id, 120)
  const { data: notifications } = useApiData<NotificationProvider[]>(() => notificationsApi.list(), [])
  const [period, setPeriod] = useState<string>('24h')
  const { data: periodUptime } = useApiData<number>(
    () => (period === 'all' ? Promise.resolve(sourceMonitor?.uptime ?? 0) : monitorsApi.uptime(id, period)),
    [period, id],
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isActive = sourceMonitor?.active ?? false
  const uptimeValue = period === 'all'
    ? (sourceMonitor?.uptime ?? 0)
    : (periodUptime ?? 0)
  const applicableProviders = (notifications ?? []).filter(p => (sourceMonitor?.notificationIds ?? []).includes(p.id))

  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl">
        <div className="h-8 w-64 rounded bg-muted/40 animate-pulse" />
        <div className="h-20 rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!sourceMonitor) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Monitor not found</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const MonitorTypeIcon = typeIcons[sourceMonitor.type] ?? Globe
  const retries = sourceMonitor.retries ?? 0
  const maxRedirects = sourceMonitor.maxredirects
  const upsideDown = sourceMonitor.upsideDown

  const toggleActive = async () => {
    try {
      await monitorsApi.update(id, { enabled: !isActive })
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  const handleDelete = async () => {
    setDeleteBusy(true)
    try {
      await monitorsApi.remove(id)
      router.push('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <span className="text-green-600 dark:text-green-400">
            <MonitorTypeIcon className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-display font-semibold text-green-600 dark:text-green-400">
              {sourceMonitor.name}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              {sourceMonitor.url}
            </p>
          </div>
          <StatusBadge status={sourceMonitor.status} size="sm" />
          {upsideDown && (
            <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 text-[10px] gap-1">
              <AlertTriangle className="size-3" />
              Upside-Down
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void toggleActive()}
            className={cn(isActive ? '' : 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400')}
          >
            {isActive ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {isActive ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="size-3.5" />
            Edit
          </Button>
          {editOpen && (
            <MonitorFormDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              monitorId={id}
              onSaved={reload}
            />
          )}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger render={<Button variant="destructive" size="sm" />}>
              <Trash2 className="size-3.5" />
              Delete
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Monitor</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-foreground">{sourceMonitor.name}</span>?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>
                  All heartbeat history, incident data, and associated alerts will be permanently
                  removed.
                </span>
              </div>
              <DialogFooter showCloseButton>
                <DialogClose render={<Button variant="outline">Cancel</Button>} />
                <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleteBusy}>
                  <Trash2 className="size-4" />
                  {deleteBusy ? 'Deleting...' : 'Delete Monitor'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border border-border">
        <HeartbeatTimeline heartbeats={heartbeats} height={20} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card size="sm">
          <CardContent className="pt-(--card-spacing)">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Status</p>
            <div className="mt-1.5">
              <StatusBadge status={sourceMonitor.status} size="lg" />
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-(--card-spacing)">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Uptime ({period})
            </p>
            <p
              className={cn(
                'text-2xl font-bold mt-1 font-mono',
                uptimeValue >= 99
                  ? 'text-green-600 dark:text-green-400'
                  : uptimeValue >= 95
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-destructive',
              )}
            >
              {period === 'all'
                ? formatUptime(sourceMonitor.uptime)
                : `${uptimeValue.toFixed(2)}%`}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-(--card-spacing)">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Response Time
            </p>
            <p className="text-2xl font-bold mt-1 font-mono">
              {sourceMonitor.responseTime > 0
                ? formatMs(sourceMonitor.responseTime)
                : '\u2014'}
            </p>
            <ResponseTimeSparkline heartbeats={heartbeats} className="mt-1.5" />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-(--card-spacing)">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Last Checked
            </p>
            <p className="text-sm font-medium mt-1.5 font-mono">
              {timeAgo(sourceMonitor.lastChecked)}
            </p>
          </CardContent>
        </Card>
      </div>

      {applicableProviders.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
            <Bell className="size-3" />
            Notifications
          </span>
          {applicableProviders.map(p => {
            const ProviderIcon = providerIconMap[p.type] ?? Bell
            return (
              <Badge
                key={p.id}
                variant={p.active ? 'secondary' : 'outline'}
                className={cn(
                  'gap-1 text-[11px]',
                  p.active &&
                    'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800',
                )}
              >
                <ProviderIcon className="size-3" />
                {p.name}
                {!p.active && (
                  <BellOff className="size-2.5 text-muted-foreground" />
                )}
              </Badge>
            )
          })}
        </div>
      )}

      {sourceMonitor.notificationThreshold != null && sourceMonitor.notificationThreshold > 0 && (
        <p className="text-[11px] text-muted-foreground">
          <Bell className="size-3 inline mr-1" />
          Notify only when down response time exceeds{' '}
          <span className="font-mono text-foreground">{sourceMonitor.notificationThreshold}ms</span>
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Timeline</CardTitle>
            <div className="flex gap-1">
              {UPTIME_PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'text-xs px-2 py-1 rounded transition-colors font-mono',
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <HeartbeatTimeline heartbeats={heartbeats} height={48} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Time History</CardTitle>
        </CardHeader>
        <CardContent className="pb-(--card-spacing)">
          <ResponseTimeHistoryChart heartbeats={heartbeats} />
        </CardContent>
      </Card>

      {sourceMonitor.certificate && (
        <Card>
          <CardHeader>
            <CardTitle>SSL Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Issuer
                </p>
                <p className="font-medium mt-0.5 font-mono text-xs">
                  {sourceMonitor.certificate.issuer}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Valid From
                </p>
                <p className="font-medium mt-0.5 font-mono text-xs">
                  {formatDate(sourceMonitor.certificate.validFrom)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Valid To
                </p>
                <p className="font-medium mt-0.5 font-mono text-xs">
                  {formatDate(sourceMonitor.certificate.validTo)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Days Remaining
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={cn(
                      'font-medium font-mono',
                      sourceMonitor.certificate.daysRemaining < 30
                        ? 'text-destructive'
                        : 'text-green-600 dark:text-green-400',
                    )}
                  >
                    {sourceMonitor.certificate.daysRemaining} days
                  </span>
                  {sourceMonitor.certificate.daysRemaining < 30 && (
                    <Badge
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-[10px]"
                    >
                      Expiring Soon
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Type
              </p>
              <p className="font-medium mt-0.5 capitalize">{sourceMonitor.type}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Interval
              </p>
              <p className="font-medium mt-0.5 font-mono">
                Every {sourceMonitor.interval}s
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Timeout
              </p>
              <p className="font-medium mt-0.5 font-mono">
                {sourceMonitor.timeout}s
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Retries
              </p>
              <p className="font-medium mt-0.5 font-mono">
                {retries}
              </p>
            </div>
            {maxRedirects !== undefined && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Max Redirects
                </p>
                <p className="font-medium mt-0.5 font-mono">
                  {maxRedirects}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Created
              </p>
              <p className="font-medium mt-0.5 font-mono text-xs">
                {formatDate(sourceMonitor.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Active
              </p>
              <p className="font-medium mt-0.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      isActive ? 'bg-green-500' : 'bg-muted-foreground',
                    )}
                  />
                  {isActive ? 'Yes' : 'No'}
                </span>
              </p>
            </div>
            {upsideDown && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Mode
                </p>
                <p className="font-medium mt-0.5 text-purple-600 dark:text-purple-400 inline-flex items-center gap-1">
                  <AlertTriangle className="size-3.5" />
                  Upside-Down
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Tags
              </p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {sourceMonitor.tags.length > 0
                  ? sourceMonitor.tags.map(t => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono"
                      >
                        {t}
                      </span>
                    ))
                  : (
                    <span className="text-muted-foreground font-mono">
                      \u2014
                    </span>
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
