'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Plus, Edit3, Trash2, ExternalLink } from 'lucide-react'
import { statusPagesApi } from '@/lib/api'
import { useApiData } from '@/hooks/useApi'
import type { StatusPage } from '@/types/monitor'
import { cn } from '@/lib/utils'

export function StatusPagesListPage() {
  const { data: fetchedStatusPages, loading, reload } = useApiData<StatusPage[]>(() => statusPagesApi.list(), [])
  const statusPages = fetchedStatusPages ?? []

  const [editTarget, setEditTarget] = useState<StatusPage | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<StatusPage | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleActive = async (sp: StatusPage) => {
    try {
      await statusPagesApi.update(sp.id, { active: !sp.active })
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  const handleEdit = async () => {
    if (!editTarget || !editTitle.trim() || !editSlug.trim()) return
    setBusy(true)
    setError(null)
    try {
      await statusPagesApi.update(editTarget.id, { title: editTitle.trim(), slug: editSlug.trim() })
      setEditTarget(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    setError(null)
    try {
      await statusPagesApi.remove(deleteTarget.id)
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Status Pages</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage public status pages to share with your users.
          </p>
        </div>
        <Link href="/status-pages/new">
          <Button size="sm">
            <Plus className="size-4" />
            Create Status Page
          </Button>
        </Link>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : statusPages.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-base mb-1">No status pages yet</p>
              <p className="text-sm">Create your first public status page to share with your users.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {statusPages.map(sp => (
            <Card key={sp.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{sp.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-muted-foreground">{sp.slug}</span>
                      <Link
                        href={`/status-pages/${sp.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        View
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', sp.active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                    )}>
                      {sp.active ? 'Published' : 'Draft'}
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => toggleActive(sp)}
                      disabled={busy}
                    >
                      {sp.active ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => { setEditTarget(sp); setEditTitle(sp.title); setEditSlug(sp.slug) }}
                    >
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(sp)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editTarget !== null} onOpenChange={o => { if (!o) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Status Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Slug</label>
              <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={() => void handleEdit()} disabled={!editTitle.trim() || !editSlug.trim() || busy}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={o => { if (!o) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Status Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
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
