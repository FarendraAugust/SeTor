'use client'

import { useState, useMemo } from 'react'
import type { Monitor } from '@/types/monitor'
import { MonitorCard } from './MonitorCard'
import { MonitorFormDialog } from './MonitorFormDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Plus } from 'lucide-react'

interface MonitorListProps {
  monitors: Monitor[]
  allTags: string[]
  showAddButton?: boolean
  onMonitorsChange?: () => void
}

export function MonitorList({ monitors, allTags, showAddButton = true, onMonitorsChange }: MonitorListProps) {
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const filtered = useMemo(() => {
    return monitors.filter(m => {
      const matchesSearch = search === '' ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.url.toLowerCase().includes(search.toLowerCase())
      const matchesTag = !selectedTag || m.tags.includes(selectedTag)
      return matchesSearch && matchesTag
    })
  }, [monitors, search, selectedTag])

  const upCount = monitors.filter(m => m.status === 'up').length
  const downCount = monitors.filter(m => m.status === 'down').length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-green-600 dark:text-green-400 font-medium">{upCount} Up</span>
        {downCount > 0 && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-destructive font-medium">{downCount} Down</span>
          </>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedTag(null)}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${
              !selectedTag
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-secondary'
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search monitors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        {showAddButton && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Monitor
          </Button>
        )}
      </div>

      {addOpen && (
        <MonitorFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => { setAddOpen(false); onMonitorsChange?.() }}
        />
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {monitors.length === 0 ? (
                <>
                  <p className="text-base mb-1">No monitors yet</p>
                  <p className="text-sm">Add your first monitor to start tracking uptime.</p>
                </>
              ) : (
                <>
                  <p className="text-base mb-1">No matching monitors</p>
                  <p className="text-sm">Try adjusting your search or filters.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(monitor => (
            <MonitorCard key={monitor.id} monitor={monitor} />
          ))}
        </div>
      )}
    </div>
  )
}
