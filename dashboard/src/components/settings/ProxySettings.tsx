'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ProxyConfig } from '@/types/monitor'
import { useApiData } from '@/hooks/useApi'
import { proxiesApi } from '@/lib/api'
import { Globe, Shield, Plus, Trash2, Plug, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const protocols = ['http', 'https', 'socks4', 'socks5'] as const

const defaultForm = {
  name: '',
  protocol: 'http' as ProxyConfig['protocol'],
  host: '',
  port: 8080,
  username: '',
  password: '',
}

export function ProxySettings() {
  const { data: fetchedProxies, reload } = useApiData<ProxyConfig[]>(() => proxiesApi.list(), [])
  const proxies = fetchedProxies ?? []
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = editingId !== null
  const editingProxy = isEditing ? proxies.find(p => p.id === editingId) : null

  function resetForm() {
    setForm(defaultForm)
    setEditingId(null)
  }

  function handleEdit(proxy: ProxyConfig) {
    setEditingId(proxy.id)
    setForm({
      name: proxy.name,
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      username: proxy.auth?.username || '',
      password: proxy.auth?.password || '',
    })
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        name: form.name,
        protocol: form.protocol,
        host: form.host,
        port: form.port,
        auth: form.username
          ? { username: form.username, password: form.password }
          : undefined,
      }
      if (isEditing && editingProxy) {
        await proxiesApi.update(editingProxy.id, payload)
      } else {
        await proxiesApi.create(payload)
      }
      resetForm()
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
      await proxiesApi.remove(id)
      setDeleteId(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleTestConnection(id: string) {
    setTestingId(id)
    setTestResults(prev => { const r = { ...prev }; delete r[id]; return r })
    try {
      const result = await proxiesApi.test(id)
      setTestResults(prev => ({ ...prev, [id]: result.ok }))
    } catch {
      setTestResults(prev => ({ ...prev, [id]: false }))
    } finally {
      setTestingId(null)
    }
  }

  const protocolBadge = (p: ProxyConfig['protocol']) => {
    const colors: Record<string, string> = {
      http: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      https: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      socks4: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      socks5: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    }
    return (
      <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium', colors[p])}>
        {p.toUpperCase()}
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Proxy Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage proxy configurations for monitor checks.</p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Proxy Configurations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proxies.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No proxy configurations yet.</p>
          )}
          {proxies.map(proxy => (
            <div
              key={proxy.id}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 dark:border-input"
            >
              <Globe className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{proxy.name}</span>
                  {proxy.auth && <Shield className="size-3 text-muted-foreground shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {protocolBadge(proxy.protocol)}
                  <span className="text-xs text-muted-foreground">{proxy.host}:{proxy.port}</span>
                </div>
              </div>
              {testResults[proxy.id] !== undefined && (
                testResults[proxy.id]
                  ? <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                  : <XCircle className="size-4 text-destructive shrink-0" />
              )}
              <Button variant="ghost" size="xs" onClick={() => handleTestConnection(proxy.id)} disabled={testingId === proxy.id}>
                {testingId === proxy.id ? <Loader2 className="size-3 animate-spin" /> : <Plug className="size-3" />}
                Test
              </Button>
              <Button variant="ghost" size="xs" onClick={() => handleEdit(proxy)}>Edit</Button>
              <Dialog onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
                <DialogTrigger render={<Button variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(proxy.id)} />}>
                  <Trash2 className="size-3" />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Proxy</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete &ldquo;{proxies.find(p => p.id === deleteId)?.name}&rdquo;? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
                    <Button variant="destructive" onClick={() => deleteId && void handleDelete(deleteId)} disabled={busy}>Delete</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Proxy' : 'Add Proxy'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSave() }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Name</label>
              <Input
                placeholder="My Proxy"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Protocol</label>
              <select
                value={form.protocol}
                onChange={e => setForm(prev => ({ ...prev, protocol: e.target.value as ProxyConfig['protocol'] }))}
                className={cn(
                  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  'dark:bg-input/30'
                )}
              >
                {protocols.map(p => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="block text-sm font-medium">Host</label>
                <Input
                  placeholder="proxy.example.com"
                  value={form.host}
                  onChange={e => setForm(prev => ({ ...prev, host: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Port</label>
                <Input
                  type="number"
                  placeholder="8080"
                  value={form.port}
                  onChange={e => setForm(prev => ({ ...prev, port: Number(e.target.value) }))}
                  required
                  min={1}
                  max={65535}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Username <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Input
                  placeholder="username"
                  value={form.username}
                  onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Password <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Input
                  type="password"
                  placeholder="password"
                  value={form.password}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={busy}>
                <Plus className="size-4" />
                {isEditing ? 'Save Changes' : 'Add Proxy'}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
