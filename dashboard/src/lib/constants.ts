import type { NavItem } from '@/types/common'

export const APP_NAME = 'UBIG Monitoring'

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'grid' },
  { label: 'Monitors', href: '/monitors', icon: 'activity' },
  { label: 'Status Pages', href: '/status-pages', icon: 'file' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
  { label: 'Maintenance', href: '/maintenance', icon: 'clock' },
  { label: 'Cluster', href: '/cluster', icon: 'radar' },
]

export const MONITOR_TYPES = [
  { value: 'http', label: 'HTTP(S)', icon: 'globe' },
  { value: 'ping', label: 'Ping', icon: 'wifi' },
  { value: 'tcp', label: 'TCP Port', icon: 'plug' },
  { value: 'dns', label: 'DNS', icon: 'search' },
  { value: 'keyword', label: 'Keyword', icon: 'file-text' },
  { value: 'websocket', label: 'WebSocket', icon: 'link' },
  { value: 'json-query', label: 'JSON Query', icon: 'code' },
  { value: 'push', label: 'Push', icon: 'upload' },
  { value: 'steam', label: 'Steam Game Server', icon: 'gamepad-2' },
  { value: 'docker', label: 'Docker Container', icon: 'container' },
] as const

export const UPTIME_PERIODS = ['24h', '7d', '30d', '90d', 'all'] as const

export const DEFAULT_MONITOR_INTERVAL = 60
export const DEFAULT_MONITOR_TIMEOUT = 30
export const DEFAULT_MONITOR_RETRIES = 0

export const NOTIFICATION_PROVIDERS = [
  { value: 'telegram', label: 'Telegram', icon: 'send' },
  { value: 'discord', label: 'Discord', icon: 'message-square' },
  { value: 'slack', label: 'Slack', icon: 'slack' },
  { value: 'email', label: 'Email (SMTP)', icon: 'mail' },
  { value: 'webhook', label: 'Webhook', icon: 'webhook' },
  { value: 'gotify', label: 'Gotify', icon: 'bell' },
  { value: 'pushover', label: 'Pushover', icon: 'smartphone' },
  { value: 'signal', label: 'Signal', icon: 'message-circle' },
  { value: 'matrix', label: 'Matrix', icon: 'message-square' },
  { value: 'mattermost', label: 'Mattermost', icon: 'message-square' },
  { value: 'rocketchat', label: 'Rocket.Chat', icon: 'message-square' },
  { value: 'teams', label: 'Microsoft Teams', icon: 'users' },
  { value: 'googlechat', label: 'Google Chat', icon: 'message-circle' },
  { value: 'line', label: 'Line', icon: 'message-circle' },
  { value: 'twilio', label: 'Twilio SMS', icon: 'phone' },
  { value: 'pagerduty', label: 'PagerDuty', icon: 'activity' },
  { value: 'opsgenie', label: 'Opsgenie', icon: 'activity' },
  { value: 'ntfy', label: 'ntfy', icon: 'bell' },
  { value: 'bark', label: 'Bark', icon: 'bell' },
  { value: 'serverchan', label: 'ServerChan', icon: 'bell' },
  { value: 'pushbullet', label: 'Pushbullet', icon: 'bell' },
  { value: 'pushdeer', label: 'PushDeer', icon: 'bell' },
  { value: 'dingding', label: 'DingDing', icon: 'message-square' },
  { value: 'feishu', label: 'Feishu/Lark', icon: 'message-square' },
  { value: 'wecom', label: 'WeCom', icon: 'message-square' },
  { value: 'homeassistant', label: 'Home Assistant', icon: 'home' },
  { value: 'apprise', label: 'Apprise', icon: 'bell' },
  { value: 'zohocliq', label: 'Zoho Cliq', icon: 'message-square' },
  { value: 'splunk', label: 'Splunk', icon: 'search' },
  { value: 'grafana', label: 'Grafana On-Call', icon: 'activity' },
  { value: 'alertanow', label: 'AlertNow', icon: 'bell' },
  { value: 'flashduty', label: 'FlashDuty', icon: 'zap' },
] as const
