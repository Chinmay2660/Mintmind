'use client'

import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { TransactionSummary } from '@/lib/utils/transactions'

interface TransactionSummaryBarProps {
  summary: TransactionSummary
  loading?: boolean
}

export function TransactionSummaryBar({ summary, loading = false }: TransactionSummaryBarProps) {
  return (
    <div className={cn('surface-card overflow-hidden transition-opacity', loading && 'opacity-60')}>
      <div className="grid grid-cols-3 divide-x divide-border/50">
        <div className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Income</p>
          <p className="text-sm md:text-base font-bold text-green-600 dark:text-green-400">
            {loading ? '—' : formatCurrency(summary.income)}
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Expenses</p>
          <p className="text-sm md:text-base font-bold text-red-600 dark:text-red-400">
            {loading ? '—' : formatCurrency(summary.expense)}
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total</p>
          <p
            className={`text-sm md:text-base font-bold ${
              summary.net >= 0
                ? 'text-foreground'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {loading ? '—' : formatCurrency(summary.net)}
          </p>
        </div>
      </div>
    </div>
  )
}
