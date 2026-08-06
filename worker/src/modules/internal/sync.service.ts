import { env } from '../../config/env.js'
import { LeaderService } from '../leader/leader.service.js'
import { ReplicationService } from '../replication/replication.service.js'
import { MonitorRepository } from '../monitor/monitor.repository.js'

/**
 * Sinkronisasi hasil monitoring follower → leader.
 * - Follower mengirim batch hasil baru (checkedAt > watermark) ke leader.
 * - Leader dedup via unique index (target_id, checked_at, worker_id) dan ack
 *   dengan checkedAt maksimal batch; follower menyimpan watermark-nya sendiri,
 *   sehingga replay aman saat ganti leader.
 */
export const SyncService = {
  async pushResults() {
    if (LeaderService.isLeader()) return
    const leaderUrl = LeaderService.leaderPublicUrl()
    if (!leaderUrl) return

    const state = await ReplicationService.getSyncState()
    const rows = await MonitorRepository.rowsSince(state.lastResultsAt, env.workerId)
    if (rows.length === 0) return

    try {
      const res = await fetch(`${leaderUrl}/internal/sync/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': env.internalToken },
        body: JSON.stringify({ workerId: env.workerId, rows }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) return
      const data = await res.json() as { ackedAt: string | null }
      if (data.ackedAt) {
        await ReplicationService.setSyncState(new Date(data.ackedAt))
      }
    } catch (e: any) {
      console.error('[sync] push results failed:', e.message)
    }
  },

  start() {
    setInterval(() => this.pushResults().catch((e: any) => console.error('[sync] loop error:', e?.message)), env.resultSyncMs)
  },
} as const
