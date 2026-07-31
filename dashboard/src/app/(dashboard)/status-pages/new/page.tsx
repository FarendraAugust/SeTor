'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { statusPagesApi, monitorsApi } from '@/lib/api'
import type { Monitor } from '@/types/monitor'
import { cn } from '@/lib/utils'

export default function NewStatusPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [monitors, setMonitors] = useState<string[]>([])
  const [showUptime, setShowUptime] = useState(true)
  const [showHistory, setShowHistory] = useState(true)
  const [active, setActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchedMonitors, setFetchedMonitors] = useState<Monitor[]>([])

  useEffect(() => {
    monitorsApi.list(true).then(setFetchedMonitors).catch(() => {})
  }, [])

  const toggleMonitor = (id: string) => {
    setMonitors(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  const handleSubmit = async () => {
    if (!title.trim() || !slug.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const sp = await statusPagesApi.create({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        monitors,
        showUptime,
        showHistory,
        active,
      })
      router.push(`/status-pages/${sp.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      setSubmitting(false)
    }
  }

  const valid = title.trim().length > 0 && slug.trim().length > 0

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/status-pages" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <h2 className="text-lg font-semibold">Create Status Page</h2>
      </div>

      <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Status Page" required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Slug</label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="my-status" required />
              <p className="text-xs text-muted-foreground">
                Public URL: <code className="font-mono">{slug ? `…/status-pages/public/${slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}` : '…'}</code>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                className={cn(
                  'h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none',
                  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  'resize-y md:text-sm dark:bg-input/30'
                )}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Real-time status of our services"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {fetchedMonitors.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-2">No monitors available.</p>
              ) : (
                fetchedMonitors.map(m => (
                  <label
                    key={m.id}
                    className={cn(
                      'flex items-center gap-2 rounded-md border border-input px-2.5 py-1.5 text-xs cursor-pointer transition-colors',
                      'hover:bg-muted',
                      monitors.includes(m.id) && 'border-primary bg-primary/5'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={monitors.includes(m.id)}
                      onChange={() => toggleMonitor(m.id)}
                      className="accent-primary size-3.5"
                    />
                    {m.name}
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showUptime}
                onChange={e => setShowUptime(e.target.checked)}
                className="size-4 rounded border-input text-primary accent-primary"
              />
              Show uptime history
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showHistory}
                onChange={e => setShowHistory(e.target.checked)}
                className="size-4 rounded border-input text-primary accent-primary"
              />
              Show incident history
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                className="size-4 rounded border-input text-primary accent-primary"
              />
              Published
            </label>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!valid || submitting}>
            <Check className="size-4" />
            {submitting ? 'Creating...' : 'Create Status Page'}
          </Button>
          <Link href="/status-pages">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
