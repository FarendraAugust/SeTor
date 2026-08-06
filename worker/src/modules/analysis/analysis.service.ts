import { env } from '../../config/env.js'
import { bus } from '../bus/bus.service.js'
import { LeaderService } from '../leader/leader.service.js'
import { TargetRepository } from '../target/target.repository.js'
import { MaintenanceService } from '../maintenance/maintenance.service.js'
import { NotificationService } from '../notification/notification.service.js'
import { AnalysisRepository } from './analysis.repository.js'
import type { Monitoring } from '../monitor/monitor.types.js'

/**
 * Konsensus & analisis — hanya aktif di leader.
 *
 * Semua node meng-check target yang sama dan mengirim hasilnya ke leader.
 * Leader menghitung suara per target dari hasil terbaru tiap worker (dalam
 * freshness window), menentukan status konsensus mayoritas:
 *   - up      : suara up > down
 *   - down    : suara down > up
 *   - degraded: suara imbang / tanpa mayoritas (kandidat masalah jaringan)
 * Insiden & notifikasi dipicu dari transisi status konsensus, sehingga
 * false-alert karena 1 worker bermasalah dapat disaring.
 */

const UPTIME_PERIODS: Record<string, number> = {
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
  '90d': 90 * 24 * 3600 * 1000,
}

function groupByTarget(rows: Monitoring[]): Map<number, Monitoring[]> {
  const map = new Map<number, Monitoring[]>()
  for (const r of rows) {
    const arr = map.get(r.targetId) ?? []
    arr.push(r)
    map.set(r.targetId, arr)
  }
  return map
}

/**
 * State machine notifikasi ala Uptime Kuma:
 *   - DOWN  : alert saat streak down berturut-turut >= notificationThreshold (default 1)
 *             (mirip maxretries UK / [FAILURE]>N Gatus)
 *   - DOWN stabil: jika resendNotification=true, kirim ulang setiap notificationInterval detik
 *   - UP    : selalu kirim recovery saat transisi down -> up (tanpa gate interval)
 *   - degraded: tidak notify (≈ PENDING di UK); maintenance: tidak notify
 */
async function maybeNotify(target: {
  id: number
  name: string
  url: string
  type: string
  notificationIds: string[] | null
  notificationInterval: number | null
  notificationThreshold: number | null
  resendNotification: boolean
}, status: string, responseTime: number | null, checkedAt: Date, inMaintenance: boolean) {
  const state = await AnalysisRepository.getAlertState(target.id)
  const prevStatus = state?.lastStatus ?? 'pending'
  const now = Date.now()
  const threshold = target.notificationThreshold ?? 1
  const resendIntervalMs = (target.notificationInterval ?? 60) * 1000

  let downCount = state?.downCount ?? 0
  let notify: 'down' | 'up' | null = null

  if (status === 'down') {
    downCount = prevStatus === 'down' ? downCount + 1 : 1
    const notYetNotified = !state?.lastNotifiedAt
    if (downCount >= threshold && (prevStatus !== 'down' || notYetNotified || downCount === threshold)) {
      // Transisi masuk down, streak dipulihkan (failover/restart), atau streak melampaui threshold
      notify = 'down'
    } else if (target.resendNotification) {
      // Masih down → kirim ulang sesuai interval resend
      if (!state?.lastNotifiedAt || now - state.lastNotifiedAt.getTime() >= resendIntervalMs) notify = 'down'
    }
  } else if (status === 'up') {
    downCount = 0
    if (prevStatus === 'down') notify = 'up'
  }
  // degraded: transparan terhadap state notifikasi — tidak notify dan tidak mengubah lastStatus/downCount,
  // sehingga transisi down→degraded→up tetap terdeteksi sebagai down→up

  if (status === 'degraded') return

  if (notify && !inMaintenance) {
    await NotificationService.dispatch({
      target,
      status: notify,
      responseTime: responseTime ?? 0,
      error: notify === 'up' ? null : `consensus status: ${status}`,
      checkedAt,
    })
    await AnalysisRepository.upsertAlertState({ targetId: target.id, lastStatus: status, downCount, lastNotifiedAt: checkedAt })
    return
  }
  await AnalysisRepository.upsertAlertState({ targetId: target.id, lastStatus: status, downCount, lastNotifiedAt: state?.lastNotifiedAt ?? null })
}

async function processTarget(targetId: number, incoming: Monitoring[]) {
  const target = await TargetRepository.findById(targetId)
  if (!target) return

  const windowMs = Math.max(target.interval * 3, 180) * 1000
  const since = new Date(Date.now() - windowMs)
  const latest = await AnalysisRepository.latestPerWorker(targetId, since)

  const votes: Record<string, string> = {}
  let responseTimes: number[] = []
  let lastCheckedAt: Date | null = null
  for (const r of latest) {
    if (r.status === 'pending') continue
    votes[r.workerId] = r.status
    if (r.responseTime != null && r.responseTime > 0) responseTimes.push(r.responseTime)
    if (!lastCheckedAt || r.checkedAt > lastCheckedAt) lastCheckedAt = r.checkedAt
  }

  let ups = 0
  let downs = 0
  for (const s of Object.values(votes)) {
    if (s === 'up') ups++
    else if (s === 'down') downs++
  }

  let status = 'pending'
  if (ups + downs > 0) {
    status = ups > downs ? 'up' : downs > ups ? 'down' : 'degraded'
  }
  const avgRt = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null
  const checkedAt = lastCheckedAt ?? new Date()

  const inMaintenance = await MaintenanceService.isTargetInMaintenance(targetId)
  const prev = await AnalysisRepository.getMonitorState(targetId)
  const prevStatus = prev?.status ?? 'pending'

  await AnalysisRepository.upsertMonitorState({
    targetId,
    status: inMaintenance ? 'maintenance' : status,
    votes,
    responseTime: avgRt,
    lastCheckedAt: checkedAt,
    inMaintenance,
  })

  // Sample konsensus dari hasil check leader sendiri (basis uptime & grafik)
  const selfRows = incoming.filter((r) => r.workerId === env.workerId)
  if (selfRows.length > 0) {
    for (const r of selfRows) {
      await AnalysisRepository.upsertAnalysis({
        targetId,
        checkedAt: r.checkedAt,
        status: inMaintenance ? 'maintenance' : status,
        responseTime: avgRt ?? r.responseTime,
        degraded: status === 'degraded',
        votes,
      })
    }
  }

  // Transisi status → insiden
  if (status !== 'pending') {
    if (status === 'up') {
      const open = await AnalysisRepository.openIncident(targetId)
      if (open) await AnalysisRepository.closeIncident({ id: open.id, startedAt: open.startedAt }, new Date())
    } else if (status === 'down' || status === 'degraded') {
      const open = await AnalysisRepository.openIncident(targetId)
      if (!open) {
        await AnalysisRepository.insertIncident({ targetId, targetName: target.name, status, startedAt: new Date() })
      }
    }
    // Notifikasi dievaluasi tiap siklus (resend saat down stabil butuh evaluasi periodik)
    await maybeNotify(target, status, avgRt, checkedAt, inMaintenance)
  }

  await bus.emit('monitoring', 'monitoring.result', {
    targetId,
    targetName: target.name,
    status: inMaintenance ? 'maintenance' : status,
    responseTime: avgRt,
    statusCode: null,
    error: status === 'degraded' ? 'no majority vote across workers' : null,
    checkedAt,
  })
}

export const AnalysisService = {
  /** Entry point hasil monitoring baru (dari loop sendiri maupun push worker lain). */
  async onResults(rows: Monitoring[]) {
    if (!LeaderService.isLeader() || rows.length === 0) return
    const byTarget = groupByTarget(rows)
    for (const [targetId, targetRows] of byTarget) {
      await processTarget(targetId, targetRows)
    }
  },

  /** Rebuild state konsensus dari riwayat lokal (dijalankan saat jadi leader). */
  async rebuild() {
    if (!LeaderService.isLeader()) return
    const targets = await TargetRepository.findEnabled()
    for (const t of targets) {
      const stats = await AnalysisRepository.analysisSince(t.id, new Date(Date.now() - Math.max(t.interval * 10, 600) * 1000))
      if (stats.length === 0) continue
      const latestRow = stats[0]
      const votes: Record<string, string> = {}
      for (const s of stats) {
        for (const [wid, st] of Object.entries(s.votes ?? {})) {
          if (!votes[wid] || s.checkedAt >= latestRow.checkedAt) votes[wid] = st
        }
      }
      await AnalysisRepository.upsertMonitorState({
        targetId: t.id,
        status: latestRow.status,
        votes,
        responseTime: latestRow.responseTime,
        lastCheckedAt: latestRow.checkedAt,
        inMaintenance: false,
      })
      // Restore state notifikasi hanya jika belum ada (jangan timpa transisi/dedup yang sedang berjalan)
      const existing = await AnalysisRepository.getAlertState(t.id)
      if (!existing) {
        await AnalysisRepository.upsertAlertState({
          targetId: t.id,
          lastStatus: latestRow.status,
          downCount: latestRow.status === 'down' ? 1 : 0,
          lastNotifiedAt: null,
        })
      }
    }
  },

  async stats() {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    return AnalysisRepository.analysisStats(since)
  },

  async perTargetStats() {
    const states = await AnalysisRepository.allMonitorStates()
    const stats: Array<{ targetId: number; status: string; uptime: number; responseTime: number | null; lastCheckedAt: Date }> = []
    for (const s of states) {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
      const rows = await AnalysisRepository.analysisSince(s.targetId, since)
      const total = rows.length
      const up = rows.filter((r) => r.status === 'up').length
      stats.push({
        targetId: s.targetId,
        status: s.status,
        uptime: total === 0 ? 0 : Math.round((up / total) * 1000) / 10,
        responseTime: s.responseTime,
        lastCheckedAt: s.lastCheckedAt ?? new Date(0),
      })
    }
    return stats
  },

  async uptime(targetId: number, period: string): Promise<number> {
    const ms = UPTIME_PERIODS[period]
    if (!ms) throw new Error(`invalid period, must be one of: ${Object.keys(UPTIME_PERIODS).join(', ')}`)
    const since = new Date(Date.now() - ms)
    const rows = await AnalysisRepository.analysisSince(targetId, since)
    const total = rows.length
    const up = rows.filter((r) => r.status === 'up').length
    return total === 0 ? 0 : Math.round((up / total) * 1000) / 10
  },

  async timeline(targetId: number, limit = 120) {
    return AnalysisRepository.analysisTimeline(targetId, limit)
  },

  async incidents(limit = 50) {
    return AnalysisRepository.listIncidents(limit)
  },
} as const
