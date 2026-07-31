import type { Hono } from 'hono'
import authRoutes from './auth/auth.controller.js'
import healthRoutes from './health/health.controller.js'
import workerRoutes from './leader/worker.controller.js'
import targetRoutes from './target/target.controller.js'
import monitorRoutes from './monitor/monitor.controller.js'
import pushRoutes from './monitor/push.controller.js'
import dashboardRoutes from './dashboard/dashboard.controller.js'
import notificationRoutes from './notification/notification.controller.js'
import statusPageRoutes from './status-page/status-page.controller.js'
import maintenanceRoutes from './maintenance/maintenance.controller.js'
import proxyRoutes from './proxy/proxy.controller.js'
import apiKeyRoutes from './api-key/api-key.controller.js'
import groupRoutes from './group/group.controller.js'
import backupRoutes from './backup/backup.controller.js'
import badgeRoutes from './badge/badge.controller.js'
import metricsRoutes from './metrics/metrics.controller.js'
import { bus } from './bus/bus.service.js'
import { LeaderService } from './leader/leader.service.js'
import { MonitorService } from './monitor/monitor.service.js'

export function registerModules(app: Hono) {
  app.route('/auth', authRoutes)
  app.route('/health', healthRoutes)
  app.route('/workers', workerRoutes)
  app.route('/targets', targetRoutes)
  app.route('/monitoring', monitorRoutes)
  app.route('/api', pushRoutes)
  app.route('/dashboard', dashboardRoutes)
  app.route('/notifications', notificationRoutes)
  app.route('/status-pages', statusPageRoutes)
  app.route('/maintenance', maintenanceRoutes)
  app.route('/proxies', proxyRoutes)
  app.route('/api-keys', apiKeyRoutes)
  app.route('/groups', groupRoutes)
  app.route('/backup', backupRoutes)
  app.route('/badge', badgeRoutes)
  app.route('/metrics', metricsRoutes)

  LeaderService.start()
  MonitorService.start()

  bus.connect().then(() => {
    bus.subscribe('monitoring', (event) => {
      console.log(`[bus] ${event.type} from ${event.source}`, event.data)
    })
  })
}

export { bus }
