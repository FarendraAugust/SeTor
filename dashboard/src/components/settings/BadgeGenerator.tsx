'use client'

import { useState, useMemo, useId, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BadgeStyle, Monitor } from '@/types/monitor'
import { monitorsApi, badgeApi } from '@/lib/api'
import { Copy, Check } from 'lucide-react'

const BADGE_STYLES: BadgeStyle['style'][] = ['flat', 'plastic', 'for-the-badge', 'social']

const PREDEFINED_COLORS: Record<string, string> = {
  brightgreen: '#44cc11',
  green: '#97ca00',
  yellow: '#dfb317',
  orange: '#fe7d37',
  red: '#e05d44',
  blue: '#007ec6',
  lightgrey: '#9f9f9f',
}

function badgeSizing(label: string, value: string, style: BadgeStyle['style']) {
  const isLarge = style === 'for-the-badge'
  const isSocial = style === 'social'
  const fontSize = isLarge ? 13 : 11
  const padding = isLarge ? 10 : isSocial ? 7 : 6
  const height = isLarge ? 28 : isSocial ? 22 : 20
  const charWidth = isLarge ? 8.5 : isSocial ? 7.5 : 7
  const displayLabel = isLarge ? label.toUpperCase() : label
  const displayValue = isLarge ? value.toUpperCase() : value
  const labelWidth = Math.max(20, Math.ceil(displayLabel.length * charWidth + padding * 2))
  const valueWidth = Math.max(20, Math.ceil(displayValue.length * charWidth + padding * 2))
  return { displayLabel, displayValue, labelWidth, valueWidth, totalWidth: labelWidth + valueWidth, fontSize, height }
}

function badgeSvgString(config: { label: string; value: string; color: string; style: BadgeStyle['style'] }, uid: string): string {
  const { displayLabel, displayValue, labelWidth, valueWidth, totalWidth, fontSize, height } = badgeSizing(config.label, config.value, config.style)
  const rx = config.style === 'for-the-badge' ? 4 : config.style === 'social' ? 5 : 3
  const textY = Math.round(height / 2 + (fontSize > 11 ? 5 : 4))
  const isFlat = config.style === 'flat'
  const isPlastic = config.style === 'plastic'

  let defs = ''
  let overlays = ''

  if (isFlat) {
    defs = `<linearGradient id="sg_${uid}" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    overlays = `<rect width="${totalWidth}" height="${height}" fill="url(#sg_${uid})"/>`
  } else if (isPlastic) {
    defs = [
      `<linearGradient id="st_${uid}" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset="100%" stop-color="#fff" stop-opacity=".1"/></linearGradient>`,
      `<linearGradient id="sb_${uid}" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="100%" stop-color="#000" stop-opacity=".2"/></linearGradient>`,
      `<filter id="sd_${uid}"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity=".3"/></filter>`,
    ].join('\n    ')
    overlays = [
      `<rect width="${totalWidth}" height="${height}" fill="url(#st_${uid})"/>`,
      `<rect width="${totalWidth}" height="${height}" fill="url(#sb_${uid})"/>`,
    ].join('\n    ')
  }

  const filterAttr = isPlastic ? ` filter="url(#sd_${uid})"` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img">
  <defs>
    ${defs}
    <clipPath id="c_${uid}"><rect width="${totalWidth}" height="${height}" rx="${rx}"/></clipPath>
  </defs>
  <g clip-path="url(#c_${uid})"${filterAttr}>
    <rect width="${labelWidth}" height="${height}" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${config.color}"/>
    ${overlays}
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="${fontSize}">
    <text x="${Math.round(labelWidth / 2)}" y="${textY}">${displayLabel}</text>
    <text x="${Math.round(labelWidth + valueWidth / 2)}" y="${textY}">${displayValue}</text>
  </g>
</svg>`
}

function BadgePreview({ config, uid }: { config: { label: string; value: string; color: string; style: BadgeStyle['style'] }; uid: string }) {
  const { displayLabel, displayValue, labelWidth, valueWidth, totalWidth, fontSize, height } = badgeSizing(config.label, config.value, config.style)
  const rx = config.style === 'for-the-badge' ? 4 : config.style === 'social' ? 5 : 3
  const textY = Math.round(height / 2 + (fontSize > 11 ? 5 : 4))
  const isFlat = config.style === 'flat'
  const isPlastic = config.style === 'plastic'

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={totalWidth} height={height} className="inline-block align-middle">
      <defs>
        {isFlat && (
          <linearGradient id={`sg_${uid}`} x2="0" y2="100%">
            <stop offset="0" stopColor="#fff" stopOpacity=".07" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        )}
        {isPlastic && (
          <>
            <linearGradient id={`st_${uid}`} x2="0" y2="100%">
              <stop offset="0" stopColor="#fff" stopOpacity=".4" />
              <stop offset="100%" stopColor="#fff" stopOpacity=".1" />
            </linearGradient>
            <linearGradient id={`sb_${uid}`} x2="0" y2="100%">
              <stop offset="0" stopColor="#fff" stopOpacity=".1" />
              <stop offset="100%" stopColor="#000" stopOpacity=".2" />
            </linearGradient>
            <filter id={`sd_${uid}`}>
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".3" />
            </filter>
          </>
        )}
        <clipPath id={`c_${uid}`}>
          <rect width={totalWidth} height={height} rx={rx} />
        </clipPath>
      </defs>
      <g clipPath={`url(#c_${uid})`} filter={isPlastic ? `url(#sd_${uid})` : undefined}>
        <rect width={labelWidth} height={height} fill="#555" />
        <rect x={labelWidth} width={valueWidth} height={height} fill={config.color} />
        {isFlat && <rect width={totalWidth} height={height} fill={`url(#sg_${uid})`} />}
        {isPlastic && (
          <>
            <rect width={totalWidth} height={height} fill={`url(#st_${uid})`} />
            <rect width={totalWidth} height={height} fill={`url(#sb_${uid})`} />
          </>
        )}
      </g>
      <g fill="#fff" textAnchor="middle" fontFamily="DejaVu Sans, Verdana, Geneva, sans-serif" fontSize={fontSize}>
        <text x={Math.round(labelWidth / 2)} y={textY}>{displayLabel}</text>
        <text x={Math.round(labelWidth + valueWidth / 2)} y={textY}>{displayValue}</text>
      </g>
    </svg>
  )
}

export function BadgeGenerator() {
  const uid = useId()
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [selectedMonitorId, setSelectedMonitorId] = useState('')
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle['style']>('flat')
  const [label, setLabel] = useState('uptime')
  const [colorName, setColorName] = useState('brightgreen')
  const [customColor, setCustomColor] = useState('')
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedMd, setCopiedMd] = useState(false)

  useEffect(() => {
    monitorsApi.list(true).then(list => {
      setMonitors(list)
      if (list.length > 0) setSelectedMonitorId(list[0].id)
    }).catch(() => {})
  }, [])

  const selectedMonitor = useMemo(
    () => monitors.find(m => m.id === selectedMonitorId),
    [selectedMonitorId, monitors]
  )

  const colorValue = customColor || PREDEFINED_COLORS[colorName] || '#44cc11'
  const badgeValue = selectedMonitor ? `${selectedMonitor.uptime.toFixed(2)}%` : '100%'
  const workerBadgeUrl = selectedMonitor
    ? badgeApi.url(selectedMonitor.id, { label, color: colorName || undefined, style: badgeStyle })
    : ''

  const config = useMemo(
    () => ({ label, value: badgeValue, color: colorValue, style: badgeStyle }),
    [label, badgeValue, colorValue, badgeStyle]
  )

  const svgString = useMemo(
    () => badgeSvgString(config, uid),
    [config, uid]
  )

  const dataUrl = useMemo(() => {
    const encoded = btoa(unescape(encodeURIComponent(svgString)))
    return `data:image/svg+xml;base64,${encoded}`
  }, [svgString])

  const embedUrl = workerBadgeUrl || dataUrl
  const markdown = `![${label}](${embedUrl})`
  const html = `<img src="${embedUrl}" alt="${label}" />`

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch {}
  }, [embedUrl])

  const handleCopyMd = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopiedMd(true)
      setTimeout(() => setCopiedMd(false), 2000)
    } catch {}
  }, [markdown])

  function handleColorSelect(name: string) {
    setColorName(name)
    setCustomColor('')
  }

  const isCustomActive = customColor !== ''

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Badge Generator</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Create custom SVG badges for your monitors.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Badge Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Monitor</label>
            <select
              value={selectedMonitorId}
              onChange={e => setSelectedMonitorId(e.target.value)}
              className={cn(
                'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'dark:bg-input/30'
              )}
            >
              {monitors.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Style</label>
            <div className="flex flex-wrap gap-2">
              {BADGE_STYLES.map(s => (
                <Button
                  key={s}
                  variant={badgeStyle === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBadgeStyle(s)}
                >
                  {s.replace(/-/g, ' ')}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Label</label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="uptime"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {Object.keys(PREDEFINED_COLORS).map(name => (
                <button
                  key={name}
                  onClick={() => handleColorSelect(name)}
                  className={cn(
                    'size-6 rounded-full border-2 transition-all',
                    colorName === name && !isCustomActive
                      ? 'ring-2 ring-ring ring-offset-2 dark:ring-offset-background'
                      : 'border-transparent hover:border-foreground/20'
                  )}
                  style={{ backgroundColor: PREDEFINED_COLORS[name] }}
                  title={name}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Hex:</span>
              <Input
                value={customColor}
                onChange={e => {
                  setCustomColor(e.target.value)
                  if (e.target.value) setColorName('')
                }}
                placeholder="#44cc11"
                className="w-32 font-mono"
              />
              {isCustomActive && /^#[0-9a-fA-F]{6}$/.test(customColor) && (
                <span className="size-5 rounded border shrink-0" style={{ backgroundColor: customColor }} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30 dark:border-input min-h-[60px] overflow-x-auto">
            <BadgePreview config={config} uid={uid} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyUrl} className="gap-1.5">
              {copiedUrl ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiedUrl ? 'Copied!' : 'Copy Badge URL'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyMd} className="gap-1.5">
              {copiedMd ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiedMd ? 'Copied!' : 'Copy Markdown'}
            </Button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Markdown</span>
              <Badge variant="outline" className="text-[10px] leading-none">embed</Badge>
            </div>
            <pre className="rounded-lg border bg-muted/50 p-3 text-xs overflow-x-auto dark:border-input">
              <code className="break-all">{markdown}</code>
            </pre>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">HTML</span>
              <Badge variant="outline" className="text-[10px] leading-none">embed</Badge>
            </div>
            <pre className="rounded-lg border bg-muted/50 p-3 text-xs overflow-x-auto dark:border-input">
              <code className="break-all">{html}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
