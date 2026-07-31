import { HttpError } from '../../common/errors/http-error.js'
import { NotificationRepository } from './notification.repository.js'
import type { Notification, NotificationInput } from './notification.types.js'

type DispatchPayload = {
  target: { id: number; name: string; url: string; type: string; notificationIds: string[] | null }
  status: string
  responseTime: number
  error: string | null
  checkedAt: Date
}

async function postJson(url: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  } catch (e: any) {
    console.error(`[notify] post failed: ${url} -> ${e.message}`)
  }
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`)
}

function messageVars(payload: DispatchPayload): Record<string, string> {
  return {
    monitorName: payload.target.name,
    monitorUrl: payload.target.url,
    monitorType: payload.target.type,
    status: payload.status,
    responseTime: `${payload.responseTime}ms`,
    error: payload.error ?? '',
    time: payload.checkedAt.toISOString(),
    date: payload.checkedAt.toLocaleString(),
  }
}

const DEFAULT_MESSAGE = (payload: DispatchPayload) =>
  `[${payload.status.toUpperCase()}] ${payload.target.name} (${payload.target.type}) ` +
  `- ${payload.target.url}` +
  (payload.error ? ` - ${payload.error}` : '') +
  ` - ${payload.responseTime}ms at ${payload.checkedAt.toISOString()}`

function payloadFor(type: string, message: string, config: Record<string, string>): Record<string, unknown> | null {
  switch (type) {
    case 'discord':
      return { content: message }
    case 'slack':
    case 'mattermost':
    case 'rocketchat':
      return { text: message }
    case 'teams':
      return { text: message }
    case 'googlechat':
      return { text: message }
    case 'dingding':
      return { msgtype: 'text', text: { content: message } }
    case 'feishu':
      return { msg_type: 'text', content: { text: message } }
    case 'wecom':
      return { msgtype: 'text', text: { content: message } }
    case 'homeassistant':
      return {}
    case 'grafana':
      return { title: 'UBIG Monitoring', message, state: 'alerting' }
    case 'alertanow':
    case 'flashduty':
      return { title: 'UBIG Monitoring', message }
    case 'webhook':
      return { text: message, message }
    default:
      return null
  }
}

async function send(provider: Notification, message: string): Promise<void> {
  const { type, config } = provider

  try {
    switch (type) {
      case 'discord':
      case 'slack':
      case 'mattermost':
      case 'rocketchat':
      case 'teams':
      case 'googlechat':
      case 'dingding':
      case 'feishu':
      case 'wecom':
      case 'homeassistant':
      case 'grafana':
      case 'alertanow':
      case 'flashduty':
      case 'webhook': {
        const url = config.webhookUrl ?? config.url
        if (url) {
          const body = payloadFor(type, message, config)
          if (body) await postJson(url, body)
        }
        break
      }
      case 'telegram': {
        const botToken = config.botToken
        const chatId = config.chatId
        if (botToken && chatId) {
          await postJson(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
          })
        }
        break
      }
      case 'gotify': {
        const url = config.url
        const token = config.token
        if (url && token) {
          await postJson(`${url.replace(/\/+$/, '')}/message`, { title: 'UBIG Monitoring', message, priority: 5 }, { 'X-Gotify-Key': token })
        }
        break
      }
      case 'ntfy': {
        const topic = config.topic
        const url = config.url ?? 'https://ntfy.sh'
        if (topic) {
          try {
            await fetch(`${url.replace(/\/+$/, '')}/${topic}`, { method: 'POST', body: message })
          } catch {}
        }
        break
      }
      case 'pushover': {
        const token = config.token
        const userKey = config.userKey
        if (token && userKey) {
          await postJson('https://api.pushover.net/1/messages.json', {
            token,
            user: userKey,
            title: 'UBIG Monitoring',
            message,
          })
        }
        break
      }
      case 'email':
      case 'twilio':
      case 'signal':
      case 'matrix':
      case 'bark':
      case 'serverchan':
      case 'pushbullet':
      case 'pushdeer':
      case 'line':
      case 'pagerduty':
      case 'opsgenie':
      case 'splunk':
      case 'apprise':
      case 'zohocliq':
      case 'push':
        console.log(`[notify] ${type} not fully wired, message: ${message}`)
        break
      default:
        console.log(`[notify] unsupported type ${type}, message: ${message}`)
    }
  } catch (e: any) {
    console.error(`[notify] failed for ${type}: ${e.message}`)
  }
}

export const NotificationService = {
  async list() {
    return NotificationRepository.findAll()
  },

  async get(id: number) {
    const n = await NotificationRepository.findById(id)
    if (!n) throw HttpError.notFound('notification not found')
    return n
  },

  async create(input: NotificationInput) {
    return NotificationRepository.create(input)
  },

  async update(id: number, input: Partial<NotificationInput>) {
    await this.get(id)
    return NotificationRepository.update(id, input)
  },

  async remove(id: number) {
    await this.get(id)
    await NotificationRepository.remove(id)
  },

  async dispatch(payload: DispatchPayload) {
    const providers = await NotificationRepository.findActive()
    const applicable = providers.filter(
      (p) => (payload.target.notificationIds ?? []).includes(String(p.id)),
    )
    if (applicable.length === 0) return

    const vars = messageVars(payload)
    const fallback = DEFAULT_MESSAGE(payload)

    await Promise.all(
      applicable.map((p) => {
        const message = p.customMessage ? renderTemplate(p.customMessage, vars) : fallback
        return send(p, message)
      }),
    )
  },

  async test(id: number) {
    const provider = await this.get(id)
    if (provider.customMessage) {
      const vars = messageVars({
        target: { id: 0, name: 'Test Monitor', url: 'https://example.com', type: 'http', notificationIds: null },
        status: 'test',
        responseTime: 12,
        error: null,
        checkedAt: new Date(),
      })
      await send(provider, renderTemplate(provider.customMessage, vars))
    } else {
      await send(provider, 'Test notification from UBIG Monitoring - your notification channel works!')
    }
    return true
  },

  async detectTelegramChatIds(botToken: string) {
    if (!botToken) throw HttpError.badRequest('bot token is required')
    let payload: any
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
        signal: AbortSignal.timeout(10_000),
      })
      payload = await res.json()
    } catch {
      throw HttpError.badRequest('failed to reach Telegram API, check the bot token')
    }
    if (!payload?.ok) {
      throw HttpError.badRequest(payload?.description ?? 'invalid bot token')
    }

    const chats = new Map<number, { id: number; type: string; title: string | null; username: string | null }>()
    for (const update of payload.result ?? []) {
      const chat =
        update.message?.chat ??
        update.edited_message?.chat ??
        update.channel_post?.chat ??
        update.edited_channel_post?.chat ??
        update.my_chat_member?.chat ??
        update.chat_member?.chat
      if (chat?.id && !chats.has(chat.id)) {
        chats.set(chat.id, {
          id: chat.id,
          type: chat.type ?? 'private',
          title: chat.title ?? null,
          username: chat.username ?? null,
        })
      }
    }

    return { chats: [...chats.values()] }
  },
} as const
