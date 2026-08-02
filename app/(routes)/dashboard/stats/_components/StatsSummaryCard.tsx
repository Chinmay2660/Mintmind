'use client'

import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'

interface StatsSummaryCardProps {
  income: number
  expense: number
  net: number
  loading?: boolean
}

function StatTile({
  label,
  value,
  icon: Icon,
  iconClass,
  valueClass,
  sublabel,
  loading,
}: {
  label: string
  value: number
  icon: typeof ArrowUpCircle
  iconClass: string
  valueClass: string
  sublabel?: string
  loading?: boolean
}) {
  return (
    <div className="surface-inner p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', iconClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
      </div>
      <div>
        <p className={cn('text-xl md:text-2xl font-bold tracking-tight truncate', valueClass)}>
          {loading ? '—' : formatCurrency(value)}
        </p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{loading ? '—' : sublabel}</p>
        )}
      </div>
    </div>
  )
}

export function StatsSummaryCard({ income, expense, net, loading = false }: StatsSummaryCardProps) {
  const totalFlow = income + expense
  const incomeShare = totalFlow > 0 ? (income / totalFlow) * 100 : 0
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0

  return (
    <div className={cn('surface-card p-4 md:p-5 space-y-4 transition-opacity', loading && 'opacity-60')}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile
          label="Income"
          value={income}
          icon={ArrowUpCircle}
          iconClass="bg-green-500/15 text-green-600 dark:text-green-400"
          valueClass="text-green-600 dark:text-green-400"
          loading={loading}
        />
        <StatTile
          label="Expenses"
          value={expense}
          icon={ArrowDownCircle}
          iconClass="bg-red-500/15 text-red-600 dark:text-red-400"
          valueClass="text-red-600 dark:text-red-400"
          loading={loading}
        />
        <StatTile
          label="Net"
          value={net}
          icon={TrendingUp}
          iconClass={cn(
            'bg-primary/15',
            net >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400'
          )}
          valueClass={net >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}
          sublabel={income > 0 ? `${savingsRate}% saved` : undefined}
          loading={loading}
        />
      </div>

      {totalFlow > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Cash flow split</span>
            <span>
              {loading ? '—' : `${incomeShare.toFixed(0)}% in · ${(100 - incomeShare).toFixed(0)}% out`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-green-500/80 transition-all duration-500"
              style={{ width: `${incomeShare}%` }}
            />
            <div
              className="h-full bg-red-500/80 transition-all duration-500"
              style={{ width: `${100 - incomeShare}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
