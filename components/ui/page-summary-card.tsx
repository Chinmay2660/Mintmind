import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageSummaryCardProps {
  label: string
  value: string
  hint?: ReactNode
  className?: string
  loading?: boolean
}

export function PageSummaryCard({
  label,
  value,
  hint,
  className,
  loading,
}: PageSummaryCardProps) {
  return (
    <section className={cn('surface-card-elevated px-5 py-5 md:px-8 md:py-6', className)}>
      <p className="mm-stat-label">{label}</p>
      <p className="mm-stat-value-lg mt-2">{loading ? '—' : value}</p>
      {hint && !loading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">{hint}</div>
      )}
    </section>
  )
}
