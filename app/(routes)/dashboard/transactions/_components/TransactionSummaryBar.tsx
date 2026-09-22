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
    <div
      className={cn(
        'inline-flex w-full max-w-md overflow-hidden rounded-lg border border-border/70 bg-muted/30 transition-opacity sm:w-auto',
        loading && 'opacity-60'
      )}
    >
      <div className="grid grid-cols-3 divide-x divide-border/50">
        <div className="px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Income</p>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            {loading ? '—' : formatCurrency(summary.income)}
          </p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expenses</p>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            {loading ? '—' : formatCurrency(summary.expense)}
          </p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
          <p
            className={`text-sm font-semibold ${
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
