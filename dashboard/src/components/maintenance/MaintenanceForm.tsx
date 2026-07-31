'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { monitorsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { MaintenanceWindow, Monitor } from '@/types/monitor'

interface MaintenanceFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<MaintenanceWindow, 'id' | 'createdAt'>) => void
}

function toDatetimeLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function initForm() {
  const defaultStart = new Date(Date.now() + 3600000)
  const defaultEnd = new Date(defaultStart.getTime() + 7200000)
  return {
    title: '',
    description: '',
    startTime: toDatetimeLocal(defaultStart),
    endTime: toDatetimeLocal(defaultEnd),
    selectedMonitors: [] as string[],
    active: true,
  }
}

export function MaintenanceForm({ open, onClose, onSubmit }: MaintenanceFormProps) {
  const [form, setForm] = useState(initForm)
  const [monitors, setMonitors] = useState<Monitor[]>([])

  useEffect(() => {
    if (open) {
      monitorsApi.list(true).then(setMonitors).catch(() => {})
    }
  }, [open])

  const handleClose = useCallback(() => {
    setForm(initForm())
    onClose()
  }, [onClose])

  function updateField<K extends keyof ReturnType<typeof initForm>>(
    field: K,
    value: ReturnType<typeof initForm>[K]
  ) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleMonitor(id: string) {
    setForm(prev => ({
      ...prev,
      selectedMonitors: prev.selectedMonitors.includes(id)
        ? prev.selectedMonitors.filter(m => m !== id)
        : [...prev.selectedMonitors, id],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      monitors: form.selectedMonitors,
      active: form.active,
    })
    handleClose()
  }

  const valid =
    form.title.trim().length > 0 &&
    form.startTime.length > 0 &&
    form.endTime.length > 0 &&
    new Date(form.endTime) > new Date(form.startTime)

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Maintenance</DialogTitle>
          <DialogDescription>
            Create a maintenance window to notify about planned downtime.
          </DialogDescription>
        </DialogHeader>
        <form id="maintenance-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label htmlFor="mw-title" className="text-xs font-medium">Title</label>
            <Input
              id="mw-title"
              placeholder="e.g. Database Migration"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mw-desc" className="text-xs font-medium">Description</label>
            <textarea
              id="mw-desc"
              className={cn(
                'h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'resize-y md:text-sm dark:bg-input/30'
              )}
              placeholder="Describe the maintenance..."
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="mw-start" className="text-xs font-medium">Start Time</label>
              <Input
                id="mw-start"
                type="datetime-local"
                value={form.startTime}
                onChange={e => updateField('startTime', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="mw-end" className="text-xs font-medium">End Time</label>
              <Input
                id="mw-end"
                type="datetime-local"
                value={form.endTime}
                onChange={e => updateField('endTime', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Affected Monitors</span>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {monitors.map(m => (
                <label
                  key={m.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md border border-input px-2.5 py-1.5 text-xs cursor-pointer transition-colors',
                    'hover:bg-muted',
                    form.selectedMonitors.includes(m.id) && 'border-primary bg-primary/5'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.selectedMonitors.includes(m.id)}
                    onChange={() => toggleMonitor(m.id)}
                    className="accent-primary size-3.5"
                  />
                  {m.name}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => updateField('active', e.target.checked)}
              className="accent-primary size-3.5"
            />
            Active
          </label>
        </form>
        <DialogFooter showCloseButton>
          <Button type="submit" form="maintenance-form" disabled={!valid}>
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
