'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Key, Copy, Trash2, Plus, Check, CheckCircle2 } from 'lucide-react'
import { apiKeysApi } from '@/lib/api'
import { useApiData } from '@/hooks/useApi'
import type { ApiKey } from '@/types/monitor'
import { cn, formatDate, timeAgo } from '@/lib/utils'

function maskKey(key: string) {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 8)}${'•'.repeat(Math.max(8, key.length - 16))}${key.slice(-4)}`
}

export function ApiKeysPage() {
  const { data: fetchedKeys, loading, reload } = useApiData<ApiKey[]>(() => apiKeysApi.list(), [])
  const apiKeys = fetchedKeys ?? []
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const key = await apiKeysApi.create({ name: name.trim() })
      setCreatedKey(key)
      setCreateOpen(false)
      setName('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    setError(null)
    try {
      await apiKeysApi.remove(deleteTarget.id)
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggle(key: ApiKey) {
    try {
      await apiKeysApi.update(key.id, { active: !key.active })
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedId(key)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage API keys for programmatic access.</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create Key
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {createdKey && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-4" />
            API key created — copy it now, it won&apos;t be shown again.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-2.5 py-1.5 text-xs font-mono break-all">
              {createdKey.key}
            </code>
            <Button variant="outline" size="xs" onClick={() => copyKey(createdKey.key)} className="shrink-0">
              {copiedId === createdKey.key ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copiedId === createdKey.key ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No API keys yet.</p>
          ) : (
            apiKeys.map(k => (
              <div key={k.id} className="flex items-center gap-3 rounded-lg border p-3 dark:border-input">
                <Key className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{k.name}</span>
                    <Badge
                      variant={k.active ? 'outline' : 'ghost'}
                      className={cn('text-[10px]', k.active && 'text-green-600 dark:text-green-400')}
                    >
                      {k.active ? 'active' : 'inactive'}
                    </Badge>
                  </div>
                  <code className="text-xs text-muted-foreground font-mono">{maskKey(k.key)}</code>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Created {formatDate(k.createdAt)}
                    {k.lastUsed ? ` · Last used ${timeAgo(k.lastUsed)}` : ' · Never used'}
                  </div>
                </div>
                <Button variant="ghost" size="icon-xs" onClick={() => handleToggle(k)} disabled={busy}>
                  {k.active ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => copyKey(k.key)}>
                  {copiedId === k.key ? <Check className="size-3" /> : <Copy className="size-3" />}
                </Button>
                <Button variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(k)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={o => { if (!o) setCreateOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Key Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Prometheus Scraper"
              onKeyDown={e => { if (e.key === 'Enter') void handleCreate() }}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={() => void handleCreate()} disabled={!name.trim() || busy}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={o => { if (!o) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Any integration using this key will stop working.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={busy}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
