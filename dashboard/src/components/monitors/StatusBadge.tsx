import type { Status } from '@/types/common'
import { cn, statusLabel } from '@/lib/utils'

interface StatusBadgeProps {
  status: Status
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const dotStyle: Record<Status, string> = {
  up: 'bg-green-500',
  down: 'bg-destructive',
  pending: 'bg-yellow-500',
  unknown: 'bg-muted-foreground',
}

const labelStyle: Record<Status, string> = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-destructive',
  pending: 'text-yellow-600 dark:text-yellow-400',
  unknown: 'text-muted-foreground',
}

const sizeMap: Record<string, string> = {
  sm: 'size-2',
  md: 'size-2.5',
  lg: 'size-3',
}

export function StatusBadge({ status, showLabel = true, size = 'md' }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('rounded-full shrink-0', dotStyle[status], sizeMap[size])} />
      {showLabel && (
        <span className={cn('text-sm font-medium', labelStyle[status])}>
          {statusLabel(status)}
        </span>
      )}
    </span>
  )
}
