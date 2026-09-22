'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  barClassName?: string
  showLabel?: boolean
  label?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
}

const barVariants = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
}

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  showLabel = false,
  label,
  variant = 'default',
  size = 'md',
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const resolvedVariant =
    variant === 'default' && pct >= 100 ? 'danger' : variant === 'default' && pct >= 85 ? 'warning' : variant

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showLabel && <span className="font-medium tabular-nums">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-muted/60',
          size === 'sm' ? 'h-1.5' : 'h-2'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            barVariants[resolvedVariant],
            barClassName
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
