function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

function optional(key: string, def: string): string {
  const val = process.env[key]
  return val ? val : def
}

function optionalInt(key: string, def: number): number {
  const val = parseInt(optional(key, String(def)), 10)
  return Number.isNaN(val) ? def : val
}

const host = optional('HOST', '0.0.0.0')
const port = optionalInt('PORT', 3001)

const defaultPublicUrl = host !== '0.0.0.0' && host !== '::' ? `http://${host}:${port}` : `http://localhost:${port}`

export const env = {
  port,
  host,
  nodeEnv: optional('NODE_ENV', 'development'),
  logLevel: optional('LOG_LEVEL', 'info'),
  isProduction: process.env.NODE_ENV === 'production',

  sharedDatabaseUrl: requireEnv('DATABASE_URL'),
  localDatabaseUrl: optional('LOCAL_DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/worker_local'),
  jwtSecret: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  internalToken: requireEnv('INTERNAL_TOKEN', 'dev-internal-token'),

  // URL publik worker ini (dipakai antar node untuk election & sync)
  publicUrl: optional('PUBLIC_URL', defaultPublicUrl).replace(/\/+$/, ''),

  // Peer seeds untuk bootstrap cluster, contoh: http://10.0.0.2:3001,http://10.0.0.3:3001
  peerSeeds: optional('PEER_SEEDS', '').split(',').map((s) => s.trim()).filter(Boolean),

  checkInterval: optionalInt('CHECK_INTERVAL', 60),

  electionHeartbeatMs: optionalInt('ELECTION_HEARTBEAT_MS', 5000),
  electionTimeoutMs: optionalInt('ELECTION_TIMEOUT_MS', 15000),
  electionGraceMs: optionalInt('ELECTION_GRACE_MS', 45000),

  configSyncMs: optionalInt('CONFIG_SYNC_INTERVAL_MS', 5000),
  resultSyncMs: optionalInt('RESULT_SYNC_INTERVAL_MS', 15000),
  retentionDays: optionalInt('RETENTION_DAYS', 90),

  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),

  workerId: optional('WORKER_ID', crypto.randomUUID()),
} as const

export type Env = typeof env
