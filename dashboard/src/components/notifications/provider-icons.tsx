'use client'

import type { ComponentType } from 'react'
import {
  SiTelegram,
  SiDiscord,
  SiSignal,
  SiMatrix,
  SiMattermost,
  SiRocketdotchat,
  SiGooglechat,
  SiLine,
  SiPagerduty,
  SiOpsgenie,
  SiPushbullet,
  SiWechat,
  SiHomeassistant,
  SiSplunk,
  SiGrafana,
} from 'react-icons/si'
import {
  Bell,
  Mail,
  MessageSquare,
  MessagesSquare,
  Phone,
  Smartphone,
  Users,
  Webhook,
  Zap,
} from 'lucide-react'

type IconComponent = ComponentType<{ className?: string }>

const lucide = (C: ComponentType<{ className?: string }>): IconComponent => C

export const providerIconMap: Record<string, IconComponent> = {
  telegram: SiTelegram,
  discord: SiDiscord,
  slack: lucide(MessagesSquare),
  signal: SiSignal,
  matrix: SiMatrix,
  mattermost: SiMattermost,
  rocketchat: SiRocketdotchat,
  googlechat: SiGooglechat,
  line: SiLine,
  pagerduty: SiPagerduty,
  opsgenie: SiOpsgenie,
  pushbullet: SiPushbullet,
  wecom: SiWechat,
  homeassistant: SiHomeassistant,
  splunk: SiSplunk,
  grafana: SiGrafana,
  email: lucide(Mail),
  webhook: lucide(Webhook),
  gotify: lucide(Bell),
  pushover: lucide(Smartphone),
  teams: lucide(Users),
  twilio: lucide(Phone),
  ntfy: lucide(Bell),
  bark: lucide(Bell),
  serverchan: lucide(Bell),
  pushdeer: lucide(Bell),
  dingding: lucide(MessageSquare),
  feishu: lucide(MessageSquare),
  apprise: lucide(Bell),
  zohocliq: lucide(MessageSquare),
  alertanow: lucide(Bell),
  flashduty: lucide(Zap),
}
