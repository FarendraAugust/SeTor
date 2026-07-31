'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { metricsUrl } from '@/lib/api'

const prometheusUrl = metricsUrl
const scrapeConfig = `scrape_configs:
  - job_name: 'ubig-monitoring'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:3001']`

export function PrometheusSettings() {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prometheus Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure Prometheus to scrape metrics from this dashboard.
        </p>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Metrics Endpoint</label>
          <div className="flex gap-2">
            <Input value={prometheusUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => {
              navigator.clipboard.writeText(prometheusUrl)
              setCopiedUrl(true)
              setTimeout(() => setCopiedUrl(false), 2000)
            }}>
              {copiedUrl ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Scrape Configuration</label>
          <div className="relative">
            <pre className="rounded-lg border bg-muted/50 p-3 text-xs overflow-x-auto dark:border-input">
              <code>{scrapeConfig}</code>
            </pre>
            <Button variant="outline" size="xs" className="absolute top-2 right-2" onClick={() => {
              navigator.clipboard.writeText(scrapeConfig)
              setCopiedConfig(true)
              setTimeout(() => setCopiedConfig(false), 2000)
            }}>
              {copiedConfig ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
