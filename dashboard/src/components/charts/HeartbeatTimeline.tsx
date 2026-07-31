import type { Heartbeat } from '@/types/monitor'

interface HeartbeatTimelineProps {
  heartbeats: Heartbeat[]
  height?: number
}

export function HeartbeatTimeline({ heartbeats, height = 48 }: HeartbeatTimelineProps) {
  if (heartbeats.length === 0) return null

  return (
    <div className="flex items-end gap-px" style={{ height }}>
      {heartbeats.map((beat, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm transition-all ${
            beat.status === 'up'
              ? 'bg-green-500/70'
              : beat.status === 'down'
                ? 'bg-destructive'
                : beat.status === 'pending'
                  ? 'bg-yellow-500'
                  : 'bg-muted-foreground/50'
          }`}
          style={{
            height: beat.status === 'up' ? '100%' : beat.status === 'pending' ? '60%' : '100%',
          }}
          title={`${new Date(beat.time).toLocaleString()} - ${beat.status}${beat.responseTime ? ` (${beat.responseTime}ms)` : ''}`}
        />
      ))}
    </div>
  )
}
