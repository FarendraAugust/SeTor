import { MonitorService } from '../monitor/monitor.service.js'
import { WorkerService } from '../leader/worker.service.js'
import { MonitorRepository } from '../monitor/monitor.repository.js'

function escapeLabel(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '')
}

export const MetricsService = {
  async render(): Promise<string> {
    const [monitors, workers, stats] = await Promise.all([
      MonitorService.monitors(true),
      WorkerService.list(),
      MonitorService.stats(),
    ])

    const lines: string[] = []
    lines.push('# HELP ubig_monitor_up Whether the monitor is up (1=up, 0=down).')
    lines.push('# TYPE ubig_monitor_up gauge')
    for (const m of monitors) {
      lines.push(
        `ubig_monitor_up{name="${escapeLabel(m.name)}",id="${m.id}",type="${m.type}",url="${escapeLabel(m.url)}"} ${m.status === 'up' ? 1 : 0}`,
      )
    }
    lines.push('')
    lines.push('# HELP ubig_response_time_ms Last response time in milliseconds.')
    lines.push('# TYPE ubig_response_time_ms gauge')
    for (const m of monitors) {
      lines.push(`ubig_response_time_ms{name="${escapeLabel(m.name)}",id="${m.id}"} ${m.responseTime}`)
    }
    lines.push('')
    lines.push('# HELP ubig_uptime_percent Overall uptime percentage.')
    lines.push('# TYPE ubig_uptime_percent gauge')
    for (const m of monitors) {
      lines.push(`ubig_uptime_percent{name="${escapeLabel(m.name)}",id="${m.id}"} ${m.uptime}`)
    }
    lines.push('')
    lines.push('# HELP ubig_checks_total Total number of stored checks on this worker.')
    lines.push('# TYPE ubig_checks_total gauge')
    lines.push(`ubig_checks_total ${stats.total}`)
    lines.push('')
    lines.push('# HELP ubig_workers_online Number of online workers.')
    lines.push('# TYPE ubig_workers_online gauge')
    lines.push(`ubig_workers_online ${workers.filter((w) => w.isOnline).length}`)

    return lines.join('\n') + '\n'
  },
} as const

export { MonitorRepository }
