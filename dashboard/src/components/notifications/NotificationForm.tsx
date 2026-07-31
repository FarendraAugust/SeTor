'use client'

import { useState } from 'react'
import {
  Bell,
  Check,
  Loader2,
  ScanSearch,
  MessageCirclePlus,
} from 'lucide-react'
import type { NotificationProvider } from '@/types/monitor'
import { NOTIFICATION_PROVIDERS } from '@/lib/constants'
import { notificationsApi, type TelegramChat } from '@/lib/api'
import { providerIconMap } from './provider-icons'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const TEMPLATE_VARS = [
  { name: '{monitorName}', desc: 'Monitor name' },
  { name: '{monitorUrl}', desc: 'Monitor URL' },
  { name: '{monitorType}', desc: 'Monitor type (http, ping, ...)' },
  { name: '{status}', desc: 'up / down' },
  { name: '{responseTime}', desc: 'Response time in ms' },
  { name: '{error}', desc: 'Error message if any' },
  { name: '{time}', desc: 'ISO timestamp' },
  { name: '{date}', desc: 'Readable local date/time' },
]

const PROVIDER_CONFIG_FIELDS: Record<
  string,
  { key: string; label: string; placeholder: string; type?: string }[]
> = {
  discord: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' }],
  telegram: [
    { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF...' },
    { key: 'chatId', label: 'Chat ID', placeholder: '-1001234567890' },
  ],
  slack: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' }],
  email: [
    { key: 'host', label: 'SMTP Host', placeholder: 'smtp.example.com' },
    { key: 'port', label: 'SMTP Port', placeholder: '587' },
    { key: 'username', label: 'Username', placeholder: 'alerts@example.com' },
    { key: 'password', label: 'Password', placeholder: '********', type: 'password' },
    { key: 'from', label: 'From Address', placeholder: 'alerts@example.com' },
  ],
  webhook: [{ key: 'url', label: 'Webhook URL', placeholder: 'https://example.com/webhook' }],
  gotify: [
    { key: 'url', label: 'Gotify URL', placeholder: 'https://gotify.example.com' },
    { key: 'token', label: 'App Token', placeholder: 'ABC...' },
  ],
  pushover: [
    { key: 'token', label: 'App Token', placeholder: 'abc...' },
    { key: 'userKey', label: 'User Key', placeholder: 'abc...' },
  ],
  signal: [{ key: 'phoneNumber', label: 'Phone Number', placeholder: '+1234567890' }],
  matrix: [
    { key: 'userId', label: 'User ID', placeholder: '@user:matrix.org' },
    { key: 'password', label: 'Password', placeholder: '********', type: 'password' },
    { key: 'roomId', label: 'Room ID', placeholder: '!room:matrix.org' },
  ],
  mattermost: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://mattermost.example.com/hooks/...' }],
  rocketchat: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://rocketchat.example.com/hooks/...' }],
  teams: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://outlook.office.com/webhook/...' }],
  googlechat: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://chat.googleapis.com/v1/spaces/...' }],
  line: [{ key: 'channelToken', label: 'Channel Token', placeholder: 'abc...' }],
  twilio: [
    { key: 'accountSid', label: 'Account SID', placeholder: 'AC...' },
    { key: 'authToken', label: 'Auth Token', placeholder: '********', type: 'password' },
    { key: 'from', label: 'From Number', placeholder: '+1234567890' },
    { key: 'to', label: 'To Number', placeholder: '+1234567890' },
  ],
  pagerduty: [{ key: 'routingKey', label: 'Routing Key', placeholder: 'abc...' }],
  opsgenie: [{ key: 'apiKey', label: 'API Key', placeholder: 'abc...' }],
  ntfy: [
    { key: 'topic', label: 'Topic', placeholder: 'my-alerts' },
    { key: 'url', label: 'Server URL', placeholder: 'https://ntfy.sh' },
  ],
  bark: [
    { key: 'url', label: 'Bark URL', placeholder: 'https://api.day.app/...' },
    { key: 'deviceKey', label: 'Device Key', placeholder: 'abc...' },
  ],
  serverchan: [{ key: 'sendKey', label: 'SendKey', placeholder: 'ABC...' }],
  pushbullet: [{ key: 'apiKey', label: 'API Key', placeholder: 'abc...' }],
  pushdeer: [{ key: 'apiKey', label: 'API Key', placeholder: 'abc...' }],
  dingding: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://oapi.dingtalk.com/robot/send...' }],
  feishu: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...' }],
  wecom: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/...' }],
  homeassistant: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://homeassistant.example.com/api/webhook/...' }],
  apprise: [{ key: 'url', label: 'Apprise URL', placeholder: 'tgram://...' }],
  zohocliq: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://cliq.zoho.com/webhook/...' }],
  splunk: [
    { key: 'url', label: 'HEC URL', placeholder: 'https://splunk.example.com:8088/services/collector' },
    { key: 'token', label: 'HEC Token', placeholder: 'ABC...' },
  ],
  grafana: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://grafana.example.com/...' }],
  alertanow: [{ key: 'integrationKey', label: 'Integration Key', placeholder: 'abc...' }],
  flashduty: [{ key: 'integrationKey', label: 'Integration Key', placeholder: 'abc...' }],
}

interface Props {
  provider?: NotificationProvider | null
  onSave: (provider: NotificationProvider) => void
  onClose: () => void
}

export function NotificationForm({ provider, onSave, onClose }: Props) {
  const [type, setType] = useState(provider?.type || '')
  const [name, setName] = useState(provider?.name || '')
  const [config, setConfig] = useState<Record<string, string>>(provider?.config || {})
  const [active, setActive] = useState(provider?.active ?? true)
  const [customMessage, setCustomMessage] = useState(provider?.customMessage ?? '')
  const [detecting, setDetecting] = useState(false)
  const [detectedChats, setDetectedChats] = useState<TelegramChat[]>([])
  const [detectError, setDetectError] = useState<string | null>(null)

  const configFields = type ? PROVIDER_CONFIG_FIELDS[type] || [] : []

  const selectedProvider = NOTIFICATION_PROVIDERS.find(p => p.value === type)
  const Icon = selectedProvider ? (providerIconMap[selectedProvider.value] ?? Bell) : Bell

  function handleConfigChange(key: string, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleDetectChatId() {
    const botToken = config.botToken?.trim()
    if (!botToken) {
      setDetectError('Fill in the Bot Token first.')
      return
    }
    setDetecting(true)
    setDetectError(null)
    setDetectedChats([])
    try {
      const chats = await notificationsApi.detectTelegramChatIds(botToken)
      setDetectedChats(chats)
      if (chats.length === 0) {
        setDetectError('No chats found. Send a message to your bot first (e.g. press Start in Telegram), then try again.')
      }
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : 'Failed to detect chat ID')
    } finally {
      setDetecting(false)
    }
  }

  function chatLabel(chat: TelegramChat): string {
    const name = chat.title ?? chat.username ?? `chat ${chat.id}`
    const kind = chat.type === 'private' ? 'Private' : chat.type === 'channel' ? 'Channel' : 'Group'
    return `${name} — ${kind}`
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type || !name.trim()) return

    const now = new Date().toISOString()
    const newProvider: NotificationProvider = {
      id: provider?.id || `n${Date.now()}`,
      name: name.trim(),
      type,
      config,
      active,
      applyTo: [],
      customMessage: customMessage.trim() || undefined,
      createdAt: provider?.createdAt || now,
    }
    onSave(newProvider)
  }

  function handleSelectType(newType: string) {
    setType(newType)
    if (newType !== provider?.type) {
      setConfig({})
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{provider ? 'Edit Notification' : 'Add Notification'}</DialogTitle>
          <DialogDescription>
            {provider
              ? 'Update the notification provider configuration.'
              : 'Choose a provider type and configure its settings.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!type ? (
            <div>
              <label className="block text-sm font-medium mb-2">Provider Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {NOTIFICATION_PROVIDERS.map(p => {
                  const PIcon = providerIconMap[p.value] ?? Bell
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleSelectType(p.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs transition-colors hover:bg-muted',
                        type === p.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      <PIcon className="size-5" />
                      <span className="leading-tight">{p.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{selectedProvider?.label}</p>
                  <button
                    type="button"
                    onClick={() => setType('')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change provider type
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Name</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="My Notification"
                    required
                  />
                </div>

                {configFields.map(field => {
                  const isTelegramChatId = type === 'telegram' && field.key === 'chatId'
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label className="block text-sm font-medium">{field.label}</label>
                      {isTelegramChatId ? (
                        <div className="flex gap-2">
                          <Input
                            type={field.type || 'text'}
                            value={config[field.key] || ''}
                            onChange={e => handleConfigChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDetectChatId()}
                            disabled={detecting}
                            className="shrink-0"
                          >
                            {detecting ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
                            Detect
                          </Button>
                        </div>
                      ) : (
                        <Input
                          type={field.type || 'text'}
                          value={config[field.key] || ''}
                          onChange={e => handleConfigChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}

                      {isTelegramChatId && detectedChats.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-xs text-muted-foreground">Detected chats:</p>
                          {detectedChats.map(chat => (
                            <button
                              key={chat.id}
                              type="button"
                              onClick={() => handleConfigChange('chatId', String(chat.id))}
                              className="flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                            >
                              <MessageCirclePlus className="size-3.5 text-primary shrink-0" />
                              <span className="flex-1 min-w-0 truncate">{chatLabel(chat)}</span>
                              <span className="text-xs text-muted-foreground font-mono">{chat.id}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {isTelegramChatId && detectError && (
                        <p className="text-xs text-destructive">{detectError}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Active</label>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    active ? 'bg-primary' : 'bg-input',
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
                      active ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Custom Message <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="e.g. [{status}] {monitorName} is {status} - {responseTime}"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                />
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map(v => (
                    <button
                      key={v.name}
                      type="button"
                      title={v.desc}
                      onClick={() => setCustomMessage(prev => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${v.name}`)}
                      className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the default message. Available variables:
                  {TEMPLATE_VARS.map(v => v.name).join(', ')}
                </p>
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={!name.trim()}>
                  <Check className="size-4" />
                  {provider ? 'Save Changes' : 'Add Provider'}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>

        {!type && (
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
