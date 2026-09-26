'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'
import { cn } from '@/lib/utils'

interface FinanceStatCardProps {
  title: string
  value: number
  subtitle?: string
  icon?: LucideIcon
  trend?: number | null
  href?: string
  loading?: boolean
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  format?: 'currency' | 'number' | 'percent'
  className?: string
}

const glowMap = {
  default: '',
  primary: 'mm-glow-primary',
  success: 'mm-glow-success',
  warning: 'mm-glow-warning',
  danger: 'mm-glow-danger',
}

const iconStyles = {
  default: 'bg-muted/60 text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
}

export function FinanceStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  href,
  loading,
  variant = 'default',
  format = 'currency',
  className,
}: FinanceStatCardProps) {
  const { fmt } = usePrivacyAmount()
  const displayValue =
    format === 'number'
      ? value.toLocaleString('en-IN', { maximumFractionDigits: 1 })
      : format === 'percent'
        ? `${value.toFixed(1)}%`
        : fmt(value)

  const content = (
    <div
      className={cn(
        'surface-card group relative flex min-h-[6.5rem] flex-col justify-between overflow-hidden p-3.5 sm:min-h-[7.5rem] sm:p-4 md:min-h-[8.5rem] md:p-5',
        glowMap[variant],
        href && 'cursor-pointer transition-all active:scale-[0.99] md:hover:border-primary/20',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="mm-stat-label min-w-0 truncate" title={title}>{title}</p>
        {Icon && (
          <div
            className={cn(
              'hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex md:h-9 md:w-9 md:rounded-xl',
              iconStyles[variant]
            )}
          >
            <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="mt-auto min-w-0 pt-3">
        <p
          className="truncate text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl md:text-2xl"
          title={loading ? undefined : displayValue}
        >
          {loading ? '—' : displayValue}
        </p>
        {(subtitle || trend != null) && (
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {subtitle}
              {trend != null && !loading && ` · ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
            </p>
            {href && <HrefChevron />}
          </div>
        )}
        {href && !subtitle && trend == null && (
          <div className="mt-1 flex justify-end"><HrefChevron /></div>
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full min-w-0 rounded-[var(--radius-xl)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    )
  }

  return content
}

function HrefChevron() {
  return (
    <ChevronRight
      aria-hidden
      className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 md:group-hover:text-muted-foreground"
    />
  )
}
