'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { NAV_ITEMS, APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Activity,
  FileText,
  Settings,
  Clock,
} from 'lucide-react'

const icons: Record<string, React.ReactNode> = {
  grid: <LayoutDashboard className="size-4" />,
  activity: <Activity className="size-4" />,
  file: <FileText className="size-4" />,
  settings: <Settings className="size-4" />,
  clock: <Clock className="size-4" />,
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-bold">U</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{APP_NAME}</span>
                <span className="truncate text-xs text-muted-foreground">Monitoring</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(item => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={{
                        children: (
                          <div className="flex flex-col gap-0.5">
                            <span>{item.label}</span>
                            <span className="text-[10px] opacity-60">{item.href}</span>
                          </div>
                        ),
                      }}
                      render={<Link href={item.href} />}
                      className={cn(
                        'relative transition-all duration-150',
                        isActive && 'before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-r-full before:bg-primary'
                      )}
                    >
                      {icons[item.icon]}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
