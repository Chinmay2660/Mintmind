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
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-destructive/12 text-destructive',
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
        'surface-card group relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden p-4 md:min-h-[8.5rem] md:p-5',
        glowMap[variant],
        href && 'cursor-pointer transition-all active:scale-[0.99] md:hover:border-primary/20',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="mm-stat-label">{title}</p>
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              iconStyles[variant]
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="mt-auto pt-3">
        <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground md:text-2xl">
          {loading ? '—' : displayValue}
        </p>
        {(subtitle || trend != null) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {subtitle}
            {trend != null && !loading && ` · ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
          </p>
        )}
      </div>

      {href && (
        <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 md:group-hover:text-muted-foreground" />
      )}
    </div>
  )

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>
  }

  return content
}
