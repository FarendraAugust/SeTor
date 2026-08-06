import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { env } from '../../config/env.js'
import { workers, clusterState } from './leader.schema.js'

/**
 * Leader election berbasis HTTP quorum (tanpa shared DB pusat).
 *
 * - Setiap node punya Postgres sendiri (shared schema di-replikasi per-node).
 * - Election: term + suara mayoritas (≥2 dari 3 node). Heartbeat HTTP 5s.
 * - Lone survivor: jika semua peer unreachable selama ELECTION_GRACE_MS
 *   (default 45s), node terakhir mengklaim leadership — sistem tetap jalan
 *   meski 1-2 server mati.
 * - Tradeoff yang disadari: saat network partition 2-1, kedua sisi bisa
 *   mengklaim leader (lone survivor rule). Side effect dibatasi karena node
 *   yang melihat term lebih tinggi akan otomatis demote.
 */

type ElectionState = 'follower' | 'candidate' | 'leader'

const HB = env.electionHeartbeatMs
const TIMEOUT = env.electionTimeoutMs
const GRACE = env.electionGraceMs

let currentIsLeader = false
let state: ElectionState = 'follower'
let currentTerm = 0
let currentLeaderId: string | null = null
let votedFor: string | null = null
let votedTerm = -1
let lastSeenLeaderAt = 0
let lastPeerSeenAt = 0
let electionDeadline = 0
let started = false
const becomeLeaderHooks = new Set<() => void | Promise<void>>()

interface Peer {
  id: string
  publicUrl: string
  term: number
  isLeader: boolean
}

const peers = new Map<string, Peer>()

function majoritySize(): number {
  return Math.floor(peers.size / 2) + 1
}

function addPeer(publicUrl: string, id?: string) {
  const url = publicUrl.replace(/\/+$/, '')
  if (url === env.publicUrl) return
  const key = id ?? url
  if (!peers.has(key)) {
    peers.set(key, { id: key, publicUrl: url, term: 0, isLeader: false })
  } else {
    const p = peers.get(key)!
    p.publicUrl = url
  }
}

function leaderPublicUrl(): string | null {
  if (currentIsLeader) return env.publicUrl
  const leaderId = currentLeaderId
  if (!leaderId) return null
  const peer = peers.get(leaderId)
  if (peer) return peer.publicUrl
  return null
}

async function persistState() {
  await dbShared.insert(clusterState).values({
    nodeId: env.workerId,
    term: currentTerm,
    state,
    leaderId: currentLeaderId,
  }).onConflictDoUpdate({
    target: clusterState.nodeId,
    set: { term: currentTerm, state, leaderId: currentLeaderId, updatedAt: new Date() },
  }).catch(() => {})
}

async function touchRow() {
  await dbShared.update(workers)
    .set({ lastHeartbeat: new Date(), isLeader: currentIsLeader, term: currentTerm })
    .where(eq(workers.id, env.workerId))
    .catch(() => {})
}

function applyLeaderState(isLeader: boolean) {
  const prev = currentIsLeader
  currentIsLeader = isLeader
  if (isLeader && !prev) {
    currentLeaderId = env.workerId
    for (const fn of becomeLeaderHooks) {
      Promise.resolve(fn()).catch((e: any) => console.error('[leader] hook error:', e?.message))
    }
  }
  if (!isLeader && prev) {
    currentIsLeader = false
    console.log(`[leader] ${env.workerId} lost leadership (term ${currentTerm}, now follower)`)
  }
}

async function becomeLeader() {
  if (state === 'leader') return
  state = 'leader'
  currentLeaderId = env.workerId
  votedFor = env.workerId
  votedTerm = currentTerm
  await persistState()
  await dbShared.update(workers)
    .set({ isLeader: true, term: currentTerm, electedAt: new Date(), lastHeartbeat: new Date() })
    .where(eq(workers.id, env.workerId))
    .catch(() => {})
  applyLeaderState(true)
  console.log(`[leader] ${env.workerId} became leader (term ${currentTerm}, url=${env.publicUrl}, peers=${peers.size})`)
}

async function stepDown(reason: string, adoptTerm: number) {
  if (state === 'follower' && currentTerm >= adoptTerm) return
  if (adoptTerm > currentTerm) currentTerm = adoptTerm
  votedFor = null
  votedTerm = -1
  state = 'follower'
  currentIsLeader = false
  await persistState()
  await dbShared.update(workers)
    .set({ isLeader: false, term: currentTerm, lastHeartbeat: new Date() })
    .where(eq(workers.id, env.workerId))
    .catch(() => {})
  if (reason) console.log(`[leader] stepped down: ${reason} (term ${currentTerm})`)
}

async function httpGet(url: string, timeoutMs = 3000): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { 'X-Internal-Token': env.internalToken },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function httpPost(url: string, body: unknown, timeoutMs = 3000): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': env.internalToken },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function handlePeerInfo(peerId: string, info: Record<string, unknown>) {
  if (typeof info.term === 'number') {
    const peer = peers.get(peerId)
    if (peer) peer.term = info.term
    if (info.isLeader && info.term >= currentTerm && state !== 'leader') {
      const newLeader = String(info.leaderId ?? peerId)
      const changed = newLeader !== currentLeaderId
      currentLeaderId = newLeader
      lastSeenLeaderAt = Date.now()
      electionDeadline = Date.now() + TIMEOUT + Math.floor(Math.random() * TIMEOUT)
      if (changed) {
        console.log(`[leader] ${env.workerId} follows ${newLeader} (term ${info.term}, url=${String(info.publicUrl ?? '')})`)
      }
    }
  }
}

/** Kirim heartbeat ke semua peer; update status lokal. Return jumlah peer yang reachable. */
async function probePeers(): Promise<number> {
  let reachable = 0
  const me = {
    workerId: env.workerId,
    publicUrl: env.publicUrl,
    term: currentTerm,
    isLeader: state === 'leader',
    leaderId: currentLeaderId,
  }
  const results = await Promise.allSettled(
    [...peers.entries()].map(async ([peerId, peer]) => {
      const info = await httpGet(`${peer.publicUrl}/internal/heartbeat?workerId=${encodeURIComponent(me.workerId)}&term=${me.term}&isLeader=${me.isLeader}&leaderId=${encodeURIComponent(me.leaderId ?? '')}&publicUrl=${encodeURIComponent(me.publicUrl)}`)
      if (!info) throw new Error('unreachable')
      handlePeerInfo(peerId, info)
      // Daftarkan peer di registry lokal (follower juga probe, jadi semua node selalu sinkron)
      if (info.workerId && info.workerId !== env.workerId) {
        await dbShared.insert(workers).values({
          id: String(info.workerId),
          host: info.publicUrl ? new URL(String(info.publicUrl)).hostname : '',
          port: info.publicUrl ? Number(new URL(String(info.publicUrl)).port || 80) : 0,
          publicUrl: String(info.publicUrl ?? peer.publicUrl),
          isLeader: info.isLeader === true,
          term: Number(info.term ?? 0),
          lastHeartbeat: new Date(),
        }).onConflictDoUpdate({
          target: workers.id,
          set: {
            publicUrl: String(info.publicUrl ?? peer.publicUrl),
            isLeader: info.isLeader === true,
            term: Number(info.term ?? 0),
            lastHeartbeat: new Date(),
          },
        }).catch(() => {})
      }
      const myTerm = currentTerm
      if (typeof info.term === 'number' && info.term > myTerm) {
        await stepDown('peer has higher term', info.term)
      }
      if (typeof info.publicUrl === 'string') addPeer(String(info.publicUrl), peerId)
      if (info.workerId && info.workerId !== peerId) {
        const existing = peers.get(String(info.workerId))
        if (!existing) {
          peers.set(String(info.workerId), {
            id: String(info.workerId),
            publicUrl: String(info.publicUrl ?? peer.publicUrl),
            term: 0,
            isLeader: false,
          })
        }
      }
    }),
  )
  for (const r of results) if (r.status === 'fulfilled') reachable++
  if (reachable > 0) lastPeerSeenAt = Date.now()
  return reachable
}

async function requestVotes(): Promise<number> {
  const peerEntries = [...peers.entries()]
  const results = await Promise.allSettled(
    peerEntries.map(async ([peerId, peer]) => {
      const info = await httpPost(`${peer.publicUrl}/internal/vote`, {
        term: currentTerm,
        candidateId: env.workerId,
        publicUrl: env.publicUrl,
      })
      if (!info) throw new Error('unreachable')
      handlePeerInfo(peerId, info)
      const myTerm = currentTerm
      if (typeof info.term === 'number' && info.term > myTerm) {
        await stepDown('peer has higher term', info.term)
        return false
      }
      return info.granted === true
    }),
  )
  let votes = 1 // suara sendiri
  for (const r of results) if (r.status === 'fulfilled' && r.value === true) votes++
  return votes
}

async function tick() {
  const now = Date.now()
  const peerCount = peers.size
  if (process.env.DEBUG_ELECTION) {
    console.log(`[e] ${state} term=${currentTerm} leader=${currentLeaderId} seenAgo=${now - lastSeenLeaderAt} peers=${[...peers.values()].map((p) => `${p.id}:${p.term}:${p.isLeader}`).join(',')} votedFor=${votedFor} votedTerm=${votedTerm}`)
  }

  if (state === 'leader') {
    await probePeers()
    if (state === 'leader') {
      await touchRow()
      // verifikasi term: jika masih leader (tidak step down karena term lebih tinggi)
      const maxPeerTerm = Math.max(0, ...[...peers.values()].map((p) => p.term))
      if (maxPeerTerm > currentTerm) {
        await stepDown('higher term seen while leading', maxPeerTerm)
        return
      }
    }
    return
  }

  const leaderAlive = currentLeaderId != null && currentLeaderId !== env.workerId && now - lastSeenLeaderAt < TIMEOUT
  if (state === 'follower' && leaderAlive) {
    // Follower ikut probe semua peer agar registry (leader/offline/term) konsisten di tiap node
    await probePeers()
    await touchRow()
    return
  }

  // Follower: tunggu deadline election acak sebelum berkampanye (hindari tabrakan & ratchet term)
  if (state === 'follower' && now < electionDeadline) return

  if (state === 'follower') {
    // Jangan berkampanye di term yang sudah kita beri suara (satu suara per term)
    if (votedFor != null && votedFor !== env.workerId && votedTerm === currentTerm) currentTerm++
    state = 'candidate'
    currentTerm++
    votedFor = env.workerId
    votedTerm = currentTerm

    // Election timeout acak [T, 2T) agar kandidat tidak bertabrakan
    electionDeadline = now + TIMEOUT + Math.floor(Math.random() * TIMEOUT)
    await persistState()
  }

  // Candidate: minta suara
  if (state === 'candidate') {
    if (now > electionDeadline) {
      // Kampanye gagal → backoff acak sebelum coba lagi (jangan ratchet term terus)
      state = 'follower'
      votedFor = null
      electionDeadline = now + TIMEOUT + Math.floor(Math.random() * TIMEOUT)
      await persistState()
      return
    }
    const reachable = await probePeers()
    if (state !== 'candidate') return // step down saat probing
    // Leader yang valid terlihat → mundur tanpa menaikkan term (hindari churn)
    if (currentLeaderId != null && currentLeaderId !== env.workerId && now - lastSeenLeaderAt < TIMEOUT) {
      state = 'follower'
      electionDeadline = now + TIMEOUT + Math.floor(Math.random() * TIMEOUT)
      await persistState()
      return
    }
    const votes = await requestVotes()
    if (state !== 'candidate') return
    if (votes >= majoritySize()) {
      await becomeLeader()
      return
    }
    if (reachable === 0 && (peerCount === 0 || now - lastPeerSeenAt > GRACE)) {
      // Lone survivor: tidak ada peer yang bisa dihubungi dalam grace period
      await becomeLeader()
      return
    }
  }
}

export const LeaderService = {
  isLeader(): boolean {
    return currentIsLeader
  },

  currentTerm() {
    return currentTerm
  },

  leaderId(): string | null {
    return currentLeaderId
  },

  leaderPublicUrl(): string | null {
    return leaderPublicUrl()
  },

  onBecomeLeader(fn: () => void | Promise<void>) {
    becomeLeaderHooks.add(fn)
  },

  peers(): Peer[] {
    return [...peers.values()]
  },

  /** Daftar publicUrl peer (untuk sync hasil & config). */
  peerUrls(): string[] {
    return [...peers.values()].map((p) => p.publicUrl)
  },

  /** Dipanggil route /internal/heartbeat — update row peer di tabel workers lokal. */
  async handleHeartbeat(info: { workerId: string; publicUrl: string; term: number; isLeader: boolean; leaderId: string }) {
    if (info.publicUrl) {
      addPeer(info.publicUrl, info.workerId || undefined)
    }
    if (info.workerId && info.workerId !== env.workerId) {
      const peer = peers.get(info.workerId)
      if (peer) {
        peer.term = info.term ?? 0
        peer.isLeader = info.isLeader === true
        if (info.publicUrl) peer.publicUrl = info.publicUrl
      }
      await dbShared.insert(workers).values({
        id: info.workerId,
        host: info.publicUrl ? new URL(info.publicUrl).hostname : '',
        port: info.publicUrl ? Number(new URL(info.publicUrl).port || 80) : 0,
        publicUrl: info.publicUrl ?? peer?.publicUrl ?? '',
        isLeader: info.isLeader === true,
        term: info.term ?? 0,
        lastHeartbeat: new Date(),
      }).onConflictDoUpdate({
        target: workers.id,
        set: {
          publicUrl: info.publicUrl ?? '',
          isLeader: info.isLeader === true,
          term: info.term ?? 0,
          lastHeartbeat: new Date(),
        },
      }).catch(() => {})

      if (info.isLeader && (info.term ?? 0) >= currentTerm && state !== 'leader') {
        currentLeaderId = info.workerId
        lastSeenLeaderAt = Date.now()
        electionDeadline = Date.now() + TIMEOUT + Math.floor(Math.random() * TIMEOUT)
      }
      if (info.term != null && info.term > currentTerm) {
        await stepDown('peer has higher term', info.term)
      }
    }
    return {
      workerId: env.workerId,
      publicUrl: env.publicUrl,
      term: currentTerm,
      isLeader: state === 'leader',
      leaderId: currentLeaderId,
    }
  },

  /** Dipanggil route /internal/vote. */
  async handleVote(body: { term: number; candidateId: string; publicUrl: string }) {
    if (!body || typeof body.term !== 'number' || !body.candidateId) {
      return { granted: false, term: currentTerm, leaderId: currentLeaderId }
    }
    if (body.candidateId === env.workerId) {
      return { granted: true, term: currentTerm, leaderId: currentLeaderId }
    }
    if (body.publicUrl) addPeer(body.publicUrl, body.candidateId)

    // Raft: request apapun dengan term lebih tinggi → adopsi term + turun takhta
    if (body.term > currentTerm) {
      await stepDown('vote request with higher term', body.term)
    }

    if (body.term < currentTerm) {
      return { granted: false, term: currentTerm, leaderId: currentLeaderId }
    }
    if (state === 'leader' && currentTerm >= body.term) {
      return { granted: false, term: currentTerm, leaderId: env.workerId }
    }
    // Satu suara per term (Raft): sudah memilih di term ini & bukan kandidat ini → tolak
    if (votedTerm === body.term && votedFor != null && votedFor !== body.candidateId) {
      return { granted: false, term: currentTerm, leaderId: currentLeaderId }
    }
    if (votedFor == null || votedFor === body.candidateId) {
      votedFor = body.candidateId
      votedTerm = body.term
      // Reset timer election setelah memberi suara (Raft) — jangan langsung berkampanye
      electionDeadline = Date.now() + TIMEOUT + Math.floor(Math.random() * TIMEOUT)
      await persistState()
      return { granted: true, term: currentTerm, leaderId: currentLeaderId }
    }
    return { granted: false, term: currentTerm, leaderId: currentLeaderId }
  },

  async register() {
    const [existing] = await dbShared
      .select()
      .from(workers)
      .where(eq(workers.id, env.workerId))

    if (!existing) {
      await dbShared.insert(workers).values({
        id: env.workerId,
        host: env.host,
        port: env.port,
        publicUrl: env.publicUrl,
      })
    } else {
      await dbShared.update(workers)
        .set({ host: env.host, port: env.port, publicUrl: env.publicUrl, lastHeartbeat: new Date() })
        .where(eq(workers.id, env.workerId))
    }

    // Muat state cluster dari DB lokal (survive restart)
    const [saved] = await dbShared.select().from(clusterState).where(eq(clusterState.nodeId, env.workerId))
    if (saved) {
      currentTerm = saved.term
      state = saved.state === 'leader' ? 'follower' : 'follower' // jangan klaim leader langsung saat restart
      votedFor = null
      votedTerm = -1
      currentLeaderId = null
    }

    // Seed peers dari env + workers table
    for (const seed of env.peerSeeds) addPeer(seed)
    const rows = await dbShared.select().from(workers)
    for (const w of rows) {
      if (w.id !== env.workerId && w.publicUrl) addPeer(w.publicUrl, w.id)
    }

    // Deadline election awal acak singkat agar kampanye pertama ter-stagger
    electionDeadline = Date.now() + 500 + Math.floor(Math.random() * 3000)

    if (env.peerSeeds.length === 0 && rows.length <= 1) {
      // Mode single node (dev) → langsung leader
      await becomeLeader()
      return true
    }
    return false
  },

  async elect() {
    await tick()
    return currentIsLeader
  },

  async heartbeat() {
    await touchRow()
    return { isLeader: currentIsLeader, term: currentTerm }
  },

  start() {
    if (started) return
    started = true
    this.register().then(() => {
      setInterval(() => tick().catch((e: any) => console.error('[leader] loop error:', e?.message)), HB)
    })
  },
} as const
