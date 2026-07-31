'use client'

import { useState } from 'react'
import type { MonitorGroup, Monitor } from '@/types/monitor'
import { useApiData } from '@/hooks/useApi'
import { monitorsApi, groupsApi } from '@/lib/api'
import { MonitorCard } from './MonitorCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Folder,
  FolderOpen,
  Plus,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react'

export function MonitorGroups() {
  const { data: fetchedGroups, reload } = useApiData<MonitorGroup[]>(() => groupsApi.list(), [])
  const { data: fetchedMonitors } = useApiData<Monitor[]>(() => monitorsApi.list(true), [])
  const groups = fetchedGroups ?? []
  const mockMonitors = fetchedMonitors ?? []
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMonitors, setNewMonitors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editTarget, setEditTarget] = useState<MonitorGroup | null>(null)
  const [editName, setEditName] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<MonitorGroup | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getGroupMonitors = (group: MonitorGroup) =>
    mockMonitors.filter(m => group.monitors.includes(m.id))

  const getGroupStatus = (group: MonitorGroup): 'up' | 'down' => {
    const monitors = getGroupMonitors(group)
    return monitors.some(m => m.status === 'down') ? 'down' : 'up'
  }

  const handleAddGroup = async () => {
    if (!newName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const group = await groupsApi.create({ name: newName.trim(), monitors: newMonitors })
      setExpandedIds(prev => new Set(prev).add(group.id))
      setNewName('')
      setNewMonitors([])
      setAddOpen(false)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const handleEditGroup = async () => {
    if (!editTarget || !editName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await groupsApi.update(editTarget.id, { name: editName.trim() })
      setEditTarget(null)
      setEditName('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!deleteTarget) return
    setBusy(true)
    setError(null)
    try {
      await groupsApi.remove(deleteTarget.id)
      setExpandedIds(prev => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const moveMonitor = async (groupId: string, monitorId: string, direction: 'up' | 'down') => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return
    const idx = group.monitors.indexOf(monitorId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= group.monitors.length) return
    const next = [...group.monitors]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    try {
      await groupsApi.update(groupId, { monitors: next })
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  const availableMonitors = mockMonitors.filter(m => m.active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Monitor Groups</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-base mb-1">No groups yet</p>
              <p className="text-sm">Create a group to organize your monitors.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map(group => {
            const isExpanded = expandedIds.has(group.id)
            const groupMonitors = getGroupMonitors(group)
            const status = getGroupStatus(group)
            const statusDot = status === 'down' ? 'bg-destructive' : 'bg-green-500'
            const statusBg = status === 'down'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-green-500/10 text-green-600 dark:text-green-400'

            return (
              <Card key={group.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => toggleExpand(group.id)}
                >
                  <ChevronRight className={cn(
                    'size-4 text-muted-foreground transition-transform shrink-0',
                    isExpanded && 'rotate-90'
                  )} />
                  {isExpanded
                    ? <FolderOpen className="size-4 text-muted-foreground shrink-0" />
                    : <Folder className="size-4 text-muted-foreground shrink-0" />
                  }
                  <span className="text-sm font-medium flex-1 truncate">{group.name}</span>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {group.monitors.length}
                  </Badge>
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0',
                    statusBg
                  )}>
                    <span className={cn('size-1.5 rounded-full', statusDot)} />
                    {status === 'down' ? 'Down' : 'All Up'}
                  </span>
                  <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => { setEditTarget(group); setEditName(group.name) }}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteTarget(group)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t">
                    {groupMonitors.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No monitors in this group
                      </p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto p-3">
                        {groupMonitors.map((monitor, idx) => (
                          <div key={monitor.id} className="flex items-start gap-1 shrink-0">
                            <div className="flex flex-col items-center gap-0.5 pt-2">
                              <GripVertical className="size-3.5 text-muted-foreground/30 shrink-0" />
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                disabled={idx === 0}
                                onClick={() => moveMonitor(group.id, monitor.id, 'up')}
                              >
                                <ArrowUp className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                disabled={idx === groupMonitors.length - 1}
                                onClick={() => moveMonitor(group.id, monitor.id, 'down')}
                              >
                                <ArrowDown className="size-3" />
                              </Button>
                            </div>
                            <div className="min-w-[220px]">
                              <MonitorCard monitor={monitor} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Group Name</label>
              <Input
                placeholder="e.g. Production"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Select Monitors</label>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-2">
                {availableMonitors.map(monitor => (
                  <label
                    key={monitor.id}
                    className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={newMonitors.includes(monitor.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setNewMonitors(prev => [...prev, monitor.id])
                        } else {
                          setNewMonitors(prev => prev.filter(id => id !== monitor.id))
                        }
                      }}
                      className="accent-primary size-3.5 rounded border-border"
                    />
                    <span className="font-medium truncate">{monitor.name}</span>
                    <span className="text-xs text-muted-foreground truncate ml-auto">{monitor.url}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAddGroup()} disabled={!newName.trim() || busy}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Group Name</label>
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Group name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={() => void handleEditGroup()} disabled={!editName.trim() || busy}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? The monitors in this group will not be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleDeleteGroup()} disabled={busy}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
