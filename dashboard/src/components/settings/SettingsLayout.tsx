'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Settings,
  Bell,
  Globe,
  Shield,
  Database,
  Key,
  Award,
} from 'lucide-react'

const navItems = [
  { label: 'General', href: '/settings', icon: Settings },
  { label: 'Notifications', href: '/settings/notifications', icon: Bell },
  { label: 'Proxy', href: '/settings/proxy', icon: Globe },
  { label: 'Security', href: '/settings/security', icon: Shield },
  { label: 'Backup', href: '/settings/backup', icon: Database },
  { label: 'API Keys', href: '/settings/api-keys', icon: Key },
  { label: 'Badges', href: '/settings/badges', icon: Award },
]

export function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/settings') return pathname === '/settings'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <nav className="hidden lg:flex w-48 shrink-0 flex-col gap-1">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex lg:hidden overflow-x-auto gap-1 pb-2 -mx-4 px-4 scrollbar-none">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
