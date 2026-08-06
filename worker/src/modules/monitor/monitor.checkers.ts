import type { Target, MonitorType } from '../target/target.types.js'

export type CheckResult = {
  status: 'up' | 'down' | 'pending'
  responseTime: number
  statusCode: number | null
  ping: number | null
  error: string | null
}

async function resolveProxy(target: Target): Promise<string | undefined> {
  if (!target.proxyId) return undefined
  try {
    const { ProxyRepository } = await import('../proxy/proxy.repository.js')
    const proxies = await ProxyRepository.findAll()
    const proxy = proxies.find((p) => String(p.id) === target.proxyId)
    if (!proxy) return undefined
    const auth = proxy.auth?.username ? `${encodeURIComponent(proxy.auth.username)}:${encodeURIComponent(proxy.auth.password ?? '')}@` : ''
    return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`
  } catch {
    return undefined
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout()
      reject(new Error('timeout'))
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function parseHostPort(input: string, defaultPort = 80): { host: string; port: number } {
  let s = input.trim()
  s = s.replace(/^(tcp|ssl|mongo|redis|postgres|mysql|http|https|ws|wss|udp|dns):\/\//, '')
  s = s.split('/')[0]
  s = s.replace(/^\[/, '').replace(/\]$/, '')
  const idx = s.lastIndexOf(':')
  if (idx > -1) {
    const port = Number(s.slice(idx + 1))
    if (!Number.isNaN(port) && port > 0) {
      return { host: s.slice(0, idx), port }
    }
  }
  return { host: s, port: defaultPort }
}

function stripScheme(input: string): string {
  return input.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '').split('/')[0].split('?')[0].split('#')[0]
}

function statusOk(res: { ok: boolean; status: number }): { status: 'up' | 'down'; statusCode: number; error: string | null } {
  return {
    status: res.ok ? 'up' : 'down',
    statusCode: res.status,
    error: res.ok ? null : `http ${res.status}`,
  }
}

async function checkHttp(target: Target, now: Date): Promise<CheckResult> {
  const started = performance.now()
  let statusCode = 0
  let error: string | null = null

  try {
    const timeoutMs = target.timeout * 1000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(target.url, {
      method: target.method,
      redirect: 'manual',
      signal: controller.signal,
      proxy: await resolveProxy(target),
      tls: { rejectUnauthorized: !target.ignoreTls },
    } as RequestInit)
    clearTimeout(timer)

    statusCode = res.status
    let ok = res.ok
    let url = target.url

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const max = target.maxRedirects ?? 10
      let redirects = 0
      let location = res.headers.get('location')!
      let current: Response | undefined = res

      while (redirects < max && location) {
        redirects++
        const nextUrl = new URL(location, url).toString()
        const c2 = new AbortController()
        const t2 = setTimeout(() => c2.abort(), timeoutMs)
        const next = await fetch(nextUrl, {
          method: target.method,
          redirect: 'manual',
          signal: c2.signal,
          tls: { rejectUnauthorized: !target.ignoreTls },
        } as RequestInit)
        clearTimeout(t2)
        url = nextUrl
        current = next
        location = next.headers.get('location') ?? ''
        if (next.status >= 200 && next.status < 300) break
      }
      const final = current!
      statusCode = final.status
      ok = final.ok
      await final.body?.cancel()
    } else {
      await res.body?.cancel()
    }

    const s = statusOk({ ok, status: statusCode })
    statusCode = s.statusCode
    if (s.status === 'down') error = s.error
  } catch (e: any) {
    error = e.name === 'AbortError' || e.message === 'This operation was aborted' ? 'timeout' : e.message
    statusCode = 0
  }

  const responseTime = Math.round((performance.now() - started) * 100) / 100
  return {
    status: error ? 'down' : 'up',
    responseTime,
    statusCode: statusCode || null,
    ping: null,
    error,
  }
}

async function checkKeyword(target: Target): Promise<CheckResult> {
  const started = performance.now()
  let error: string | null = null
  let statusCode: number | null = null
  let found = false

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), target.timeout * 1000)
    const res = await fetch(target.url, {
      method: target.method,
      signal: controller.signal,
      redirect: 'follow',
      proxy: await resolveProxy(target),
      tls: { rejectUnauthorized: !target.ignoreTls },
    } as RequestInit)
    clearTimeout(timer)
    statusCode = res.status
    const text = await res.text()
    const keyword = target.expectedValue ?? ''
    found = keyword.length > 0 && text.includes(keyword)
    if (!found) error = keyword ? 'keyword not found' : 'no expected value configured'
  } catch (e: any) {
    error = e.message === 'This operation was aborted' ? 'timeout' : e.message
  }

  return {
    status: error ? 'down' : found ? 'up' : 'down',
    responseTime: Math.round((performance.now() - started) * 100) / 100,
    statusCode,
    ping: null,
    error,
  }
}

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return undefined
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let cur: unknown = obj
  for (const key of keys) {
    if (cur == null) return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

async function checkJsonQuery(target: Target): Promise<CheckResult> {
  const started = performance.now()
  let error: string | null = null
  let statusCode: number | null = null
  let match = false

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), target.timeout * 1000)
    const res = await fetch(target.url, {
      method: target.method,
      signal: controller.signal,
      redirect: 'follow',
      proxy: await resolveProxy(target),
      tls: { rejectUnauthorized: !target.ignoreTls },
    } as RequestInit)
    clearTimeout(timer)
    statusCode = res.status
    const text = await res.text()
    const json = JSON.parse(text)
    const value = getByPath(json, target.jsonQuery ?? '')
    const expected = target.expectedValue ?? ''
    match = String(value ?? '') === String(expected)
    if (!match) error = `json query '${target.jsonQuery}' != '${expected}' (got '${String(value)}')`
  } catch (e: any) {
    error = e.message === 'This operation was aborted' ? 'timeout' : e.message
  }

  return {
    status: error ? 'down' : match ? 'up' : 'down',
    responseTime: Math.round((performance.now() - started) * 100) / 100,
    statusCode,
    ping: null,
    error,
  }
}

async function checkPing(target: Target): Promise<CheckResult> {
  const started = performance.now()
  const host = stripScheme(target.url).split(':')[0]

  return new Promise<CheckResult>((resolve) => {
    const proc = Bun.spawn(['ping', '-c', '1', '-W', String(Math.max(1, Math.min(target.timeout, 30))), host], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const timer = setTimeout(() => {
      try {
        proc.kill()
      } catch {}
    }, (target.timeout + 1) * 1000)

    proc.exited.then((code) => {
      clearTimeout(timer)
      const output = proc.stdout?.toString() ?? ''
      const m = output.match(/time[=<]([\d.]+)/)
      const rtt = m ? Number(m[1]) : null
      resolve({
        status: code === 0 ? 'up' : 'down',
        responseTime: Math.round((performance.now() - started) * 100) / 100,
        statusCode: null,
        ping: rtt,
        error: code === 0 ? null : 'ping failed',
      })
    })
  })
}

async function checkTcp(target: Target): Promise<CheckResult> {
  const { host, port } = parseHostPort(target.url, 80)
  const started = performance.now()

  return new Promise<CheckResult>((resolve) => {
    let done = false
    let socket: import('bun').Socket | null = null
    const finish = (r: CheckResult) => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        socket?.end()
      } catch {}
      resolve(r)
    }
    const timer = setTimeout(() => {
      finish({
        status: 'down',
        responseTime: Math.round((performance.now() - started) * 100) / 100,
        statusCode: null,
        ping: null,
        error: 'timeout',
      })
    }, target.timeout * 1000)

    Bun.connect({
      hostname: host,
      port,
      tls: target.url.startsWith('ssl://'),
      socket: {
        open() {
          const ms = Math.round((performance.now() - started) * 100) / 100
          finish({ status: 'up', responseTime: ms, statusCode: null, ping: null, error: null })
        },
        data() {},
        error(_s, err) {
          finish({
            status: 'down',
            responseTime: Math.round((performance.now() - started) * 100) / 100,
            statusCode: null,
            ping: null,
            error: err?.message ?? 'connection error',
          })
        },
        close() {
          finish({
            status: 'down',
            responseTime: Math.round((performance.now() - started) * 100) / 100,
            statusCode: null,
            ping: null,
            error: 'connection closed',
          })
        },
      },
    })
      .then((sock) => {
        socket = sock
      })
      .catch((e: any) => {
        finish({
          status: 'down',
          responseTime: Math.round((performance.now() - started) * 100) / 100,
          statusCode: null,
          ping: null,
          error: e?.message ?? 'connection error',
        })
      })
  })
}

async function checkDns(target: Target): Promise<CheckResult> {
  const host = stripScheme(target.url)
  const started = performance.now()
  try {
    const res = await withTimeout(
      Bun.dns.lookup(host),
      target.timeout * 1000,
      () => {},
    )
    return {
      status: 'up',
      responseTime: Math.round((performance.now() - started) * 100) / 100,
      statusCode: null,
      ping: null,
      error: null,
    }
  } catch (e: any) {
    return {
      status: 'down',
      responseTime: Math.round((performance.now() - started) * 100) / 100,
      statusCode: null,
      ping: null,
      error: e.message === 'timeout' ? 'timeout' : 'dns resolution failed',
    }
  }
}

async function checkWebsocket(target: Target): Promise<CheckResult> {
  const started = performance.now()
  const url = target.url.startsWith('ws') ? target.url : `ws://${target.url}`

  return new Promise<CheckResult>((resolve) => {
    let done = false
    const finish = (r: CheckResult) => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {}
      resolve(r)
    }
    const timer = setTimeout(() => {
      finish({
        status: 'down',
        responseTime: Math.round((performance.now() - started) * 100) / 100,
        statusCode: null,
        ping: null,
        error: 'timeout',
      })
    }, target.timeout * 1000)

    const ws = new WebSocket(url)
    ws.onopen = () => {
      finish({
        status: 'up',
        responseTime: Math.round((performance.now() - started) * 100) / 100,
        statusCode: null,
        ping: null,
        error: null,
      })
    }
    ws.onerror = (e) => {
      finish({
        status: 'down',
        responseTime: Math.round((performance.now() - started) * 100) / 100,
        statusCode: null,
        ping: null,
        error: 'websocket error',
      })
    }
    ws.onclose = (e) => {
      if (!done) {
        finish({
          status: 'down',
          responseTime: Math.round((performance.now() - started) * 100) / 100,
          statusCode: null,
          ping: null,
          error: e.reason || 'connection closed',
        })
      }
    }
  })
}

function encodeA2s(ip: string, port: number): Uint8Array {
  const header = Buffer.from('FFFFFFFF54536F7572636520456E67696E6520517565727900', 'hex')
  const ipBytes = ip.split('.').map((n) => parseInt(n, 10) & 0xff)
  const buf = Buffer.alloc(header.length + 6)
  header.copy(buf, 0)
  buf[header.length] = ipBytes[0] ?? 0
  buf[header.length + 1] = ipBytes[1] ?? 0
  buf[header.length + 2] = ipBytes[2] ?? 0
  buf[header.length + 3] = ipBytes[3] ?? 0
  buf[header.length + 4] = (port >> 8) & 0xff
  buf[header.length + 5] = port & 0xff
  return new Uint8Array(buf)
}

async function checkSteam(target: Target): Promise<CheckResult> {
  const { host, port } = parseHostPort(target.url, 27015)
  const started = performance.now()

  return new Promise<CheckResult>((resolve) => {
    let done = false
    let socket: { close: () => void } | null = null
    const finish = (r: CheckResult) => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        socket?.close()
      } catch {}
      resolve(r)
    }
    const timer = setTimeout(() => {
      finish({
        status: 'down',
        responseTime: Math.round((performance.now() - started) * 100) / 100,
        statusCode: null,
        ping: null,
        error: 'timeout',
      })
    }, target.timeout * 1000)

    Bun.udpSocket({
      socket: {
        data(sock, buf) {
          const text = Buffer.from(buf).toString('utf8')
          if (text.length > 4 && /[\x20-\x7e]/.test(text)) {
            const ms = Math.round((performance.now() - started) * 100) / 100
            finish({ status: 'up', responseTime: ms, statusCode: null, ping: null, error: null })
          }
        },
        error() {
          finish({
            status: 'down',
            responseTime: Math.round((performance.now() - started) * 100) / 100,
            statusCode: null,
            ping: null,
            error: 'steam query failed',
          })
        },
      },
    })
      .then((sock) => {
        socket = sock
        sock.send(encodeA2s(host, port), port, host)
      })
      .catch((e: any) => {
        finish({
          status: 'down',
          responseTime: Math.round((performance.now() - started) * 100) / 100,
          statusCode: null,
          ping: null,
          error: e?.message ?? 'steam query failed',
        })
      })
  })
}

async function checkDocker(target: Target): Promise<CheckResult> {
  const started = performance.now()
  const container = target.dockerContainer || target.url

  try {
    const proc = Bun.spawn(['docker', 'inspect', '--format', '{{.State.Running}}', container], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const code = await withTimeout(proc.exited, target.timeout * 1000, () => {
      try {
        proc.kill()
      } catch {}
    })
    const out = proc.stdout?.toString().trim() ?? ''
    const ok = code === 0 && out === 'true'
    return {
      status: ok ? 'up' : 'down',
      responseTime: Math.round((performance.now() - started) * 100) / 100,
      statusCode: null,
      ping: null,
      error: ok ? null : `container '${container}' not running`,
    }
  } catch (e: any) {
    return {
      status: 'down',
      responseTime: Math.round((performance.now() - started) * 100) / 100,
      statusCode: null,
      ping: null,
      error: e.message === 'timeout' ? 'timeout' : 'docker inspect failed',
    }
  }
}

export async function runCheck(target: Target, now: Date): Promise<CheckResult> {
  const type = target.type as MonitorType
  let result: CheckResult

  switch (type) {
    case 'http':
      result = await checkHttp(target, now)
      break
    case 'keyword':
      result = await checkKeyword(target)
      break
    case 'json-query':
      result = await checkJsonQuery(target)
      break
    case 'ping':
      result = await checkPing(target)
      break
    case 'tcp':
      result = await checkTcp(target)
      break
    case 'dns':
      result = await checkDns(target)
      break
    case 'websocket':
      result = await checkWebsocket(target)
      break
    case 'steam':
      result = await checkSteam(target)
      break
    case 'docker':
      result = await checkDocker(target)
      break
    case 'push':
      result = await checkPush(target)
      break
    default:
      result = await checkHttp(target, now)
  }

  if (target.upsideDown) {
    result.status = result.status === 'up' ? 'down' : 'up'
    result.error = result.status === 'down' ? (result.error ?? 'upside down: up flipped to down') : null
  }

  return result
}

async function checkPush(target: Target): Promise<CheckResult> {
  const latest = await import('./monitor.repository.js').then((m) => m.MonitorRepository.latestByTargetId(target.id))
  if (!latest) {
    return { status: 'pending', responseTime: 0, statusCode: null, ping: null, error: null }
  }
  return {
    status: latest.status as 'up' | 'down',
    responseTime: latest.responseTime ?? 0,
    statusCode: latest.statusCode,
    ping: latest.ping,
    error: latest.error,
  }
}
