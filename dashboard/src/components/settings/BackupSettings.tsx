'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import type { BackupData } from '@/types/monitor'
import { backupApi } from '@/lib/api'
import {
  Download,
  Upload,
  FileJson,
  Database,
  DownloadCloud,
  UploadCloud,
} from 'lucide-react'

export function BackupSettings() {
  const [importedData, setImportedData] = useState<BackupData | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastBackupAt')
    }
    return null
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await backupApi.export()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `monitoring-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      const now = new Date().toISOString()
      setLastBackupAt(now)
      localStorage.setItem('lastBackupAt', now)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }, [])

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const data = JSON.parse(text) as BackupData
        if (
          !data.version ||
          !Array.isArray(data.monitors) ||
          !Array.isArray(data.notifications) ||
          !Array.isArray(data.statusPages) ||
          !Array.isArray(data.maintenance)
        ) {
          throw new Error('Invalid backup format')
        }
        setImportedData(data)
      } catch {
        alert('Invalid backup file. Please select a valid JSON backup.')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type === 'application/json') {
        parseFile(file)
      } else {
        alert('Please drop a JSON file.')
      }
    },
    [parseFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) parseFile(file)
    },
    [parseFile]
  )

  const handleImportConfirm = useCallback(async () => {
    if (!importedData) return
    setBusy(true)
    setError(null)
    try {
      await backupApi.import(importedData)
      setConfirmOpen(false)
      setImportedData(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }, [importedData])

  const handleClearImport = useCallback(() => {
    setImportedData(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Backup & Restore</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Export your monitoring configuration or restore from a previous backup.
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Export Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a JSON file containing all monitors, notifications, status pages, and
            maintenance windows.
          </p>
          <Button onClick={() => void handleExport()} disabled={busy} className="gap-2">
            <DownloadCloud className="size-4" />
            {busy ? 'Exporting...' : 'Export Backup'}
          </Button>
          {lastBackupAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Database className="size-3" />
              Last backup: {formatDate(lastBackupAt)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Restore your configuration from a previously exported JSON file.
          </p>

          {!importedData ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
              )}
            >
              <UploadCloud
                className={cn(
                  'size-8',
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div>
                <p className="text-sm font-medium">
                  {isDragging
                    ? 'Drop your backup file here'
                    : 'Drag & drop your backup file here'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileJson className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Backup Preview</span>
                  <Badge variant="outline" className="ml-auto">
                    v{importedData.version}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <Download className="size-3.5 text-muted-foreground" />
                    <span>{importedData.monitors.length} monitors</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <Upload className="size-3.5 text-muted-foreground" />
                    <span>{importedData.notifications.length} notifications</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <FileJson className="size-3.5 text-muted-foreground" />
                    <span>{importedData.statusPages.length} status pages</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <Database className="size-3.5 text-muted-foreground" />
                    <span>{importedData.maintenance.length} maintenance</span>
                  </div>
                </div>
                {importedData.exportedAt && (
                  <p className="text-xs text-muted-foreground">
                    Exported {formatDate(importedData.exportedAt)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <Button className="gap-2" onClick={() => setConfirmOpen(true)} disabled={busy}>
                    <Upload className="size-4" />
                    Import Backup
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Import</DialogTitle>
                      <DialogDescription>
                        This will replace your current configuration with the backup data.
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border p-3 space-y-2 text-sm">
                      <p className="font-medium">Backup contents:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>{importedData.monitors.length} monitors</li>
                        <li>{importedData.notifications.length} notifications</li>
                        <li>{importedData.statusPages.length} status pages</li>
                        <li>{importedData.maintenance.length} maintenance windows</li>
                      </ul>
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>
                        Cancel
                      </DialogClose>
                      <Button onClick={() => void handleImportConfirm()} disabled={busy}>
                        {busy ? 'Importing...' : 'Import'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={handleClearImport}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
