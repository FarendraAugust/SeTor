import type { Heartbeat } from '@/types/monitor'

interface ResponseTimeChartProps {
  heartbeats: Heartbeat[]
  width?: number
  height?: number
}

export function ResponseTimeChart({ heartbeats, width = 600, height = 120 }: ResponseTimeChartProps) {
  const valid = heartbeats.filter(b => b.responseTime > 0)
  if (valid.length < 2) return null

  const maxRt = Math.max(...valid.map(b => b.responseTime))
  const minRt = Math.min(...valid.map(b => b.responseTime))
  const range = maxRt - minRt || 1

  const points = valid.map((b, i) => {
    const x = (i / (valid.length - 1)) * width
    const y = height - ((b.responseTime - minRt) / range) * (height - 10) - 5
    return `${x},${y}`
  }).join(' ')

  return (
    <div>
      <svg width={width} height={height} className="w-full h-auto" role="img" aria-label="Response time chart">
        <defs>
          <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {valid.filter((_, i) => i % Math.max(1, Math.floor(valid.length / 5)) === 0).map((b, i) => {
          const idx = valid.indexOf(b)
          const x = (idx / (valid.length - 1)) * width
          return (
            <line key={i} x1={x} y1={0} x2={x} y2={height} stroke="var(--border)" strokeWidth={0.5} opacity={0.3} />
          )
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{minRt}ms</span>
        <span>{maxRt}ms</span>
      </div>
    </div>
  )
}
