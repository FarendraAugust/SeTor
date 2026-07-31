'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { NotificationProvider } from '@/types/monitor'
import { notificationsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface Props {
  provider: NotificationProvider
}

export function TestNotificationButton({ provider }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleTest() {
    setState('loading')
    try {
      await notificationsApi.test(provider.id)
      setState('success')
    } catch {
      setState('error')
    }
    setTimeout(() => setState('idle'), 2500)
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={handleTest}
      disabled={state === 'loading' || !provider.active}
      className="gap-1"
    >
      {state === 'loading' ? (
        <Loader2 className="size-3 animate-spin" />
      ) : state === 'success' ? (
        <CheckCircle2 className="size-3 text-primary" />
      ) : state === 'error' ? (
        <XCircle className="size-3 text-destructive" />
      ) : (
        <Send className="size-3" />
      )}
      {state === 'loading'
        ? 'Sending...'
        : state === 'success'
          ? 'Sent!'
          : state === 'error'
            ? 'Failed'
            : 'Test'}
    </Button>
  )
}
