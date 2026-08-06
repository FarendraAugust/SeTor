export interface WorkerRow {
  id: string
  host: string
  port: number
  publicUrl: string
  isLeader: boolean
  term: number
  lastHeartbeat: string
  electedAt: string | null
  createdAt: string
  isOnline: boolean
}
