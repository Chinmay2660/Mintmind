'use client'

import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
  value?: number | null
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export function TrendIndicator({ value, label, className, size = 'sm' }: TrendIndicatorProps) {
  if (value == null || Number.isNaN(value)) return null

  const isPositive = value > 0
  const isNeutral = value === 0
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-medium tabular-nums',
        size === 'sm' ? 'text-xs' : 'text-sm',
        isNeutral
          ? 'text-muted-foreground'
          : isPositive
            ? 'text-success'
            : 'text-destructive',
        className
      )}
    >
      <Icon className={iconSize} />
      {label ?? `${isPositive ? '+' : ''}${Math.abs(value).toFixed(1)}%`}
    </span>
  )
}
