import { env } from '../../config/env.js'
import { WorkerService } from '../leader/worker.service.js'
import { TargetService } from '../target/target.service.js'
import { MonitorService } from '../monitor/monitor.service.js'

async function fetchWorkerData(baseUrl: string) {
  const headers = { Authorization: `Bearer ${env.internalToken}` }
  const [statsRes, targetsRes, recentRes] = await Promise.all([
    fetch(`${baseUrl}/monitoring/stats`, { headers }),
    fetch(`${baseUrl}/monitoring/targets`, { headers }),
    fetch(`${baseUrl}/monitoring?limit=20`, { headers }),
  ])
  const [stats, targets, recent] = await Promise.all([
    statsRes.json(),
    targetsRes.json(),
    recentRes.json(),
  ])
  return { stats: stats.stats, targets: targets.targets, recent: recent.results }
}

export const DashboardService = {
  async overview() {
    const me = await WorkerService.me()
    const [workers, targets, localStats, localTargets] = await Promise.all([
      WorkerService.list(),
      TargetService.list(),
      MonitorService.stats(),
      MonitorService.targets(),
    ])

    const workersData = { [me.id]: { stats: localStats, targets: localTargets } }

    if (me.isLeader) {
      const others = workers.filter((w) => w.id !== me.id && w.isOnline)
      await Promise.all(
        others.map(async (w) => {
          try {
            workersData[w.id] = await fetchWorkerData(`http://${w.host}:${w.port}`)
          } catch {
            workersData[w.id] = { stats: null, targets: [] } as never
          }
        }),
      )
    }

    return { me, workers, targets, workersData }
  },

  async health() {
    const [workers, targets, localStats] = await Promise.all([
      WorkerService.list(),
      TargetService.list(),
      MonitorService.stats(),
    ])

    const upTargets = localStats.up
    const downTargets = localStats.down
    const totalTargets = targets.filter((t) => t.enabled).length

    return {
      workers: { total: workers.length, online: workers.filter((w) => w.isOnline).length },
      targets: { total: totalTargets, up: upTargets, down: downTargets },
      uptime: localStats.uptime,
    }
  },
} as const
