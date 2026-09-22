'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  loading?: boolean
  className?: string
  contentClassName?: string
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  loading,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <div className={cn('surface-card overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4 md:px-6 md:py-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className={cn('px-5 py-4 md:px-6 md:py-5', contentClassName)}>
        {loading ? (
          <div className="skeleton h-44 w-full rounded-2xl" />
        ) : (
          children
        )}
      </div>
    </div>
  )
}
