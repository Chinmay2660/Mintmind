'use client'

import { cn } from '@/lib/utils'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'
import { CategoryDonutChart } from '../../_components/CategoryDonutChart'

const FALLBACK_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  '#8b5cf6',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
]

export interface CategoryStat {
  categoryId: string
  categoryName: string
  categoryIcon: string
  color: string | null
  total: number
  percentage: number
}

interface CategoryBreakdownCardProps {
  title: string
  categories: CategoryStat[]
  total: number
  loading?: boolean
}

function CategoryChartPlaceholder() {
  return (
    <div className="relative flex h-48 items-center justify-center">
      <div
        className="h-40 w-40 rounded-full border-[14px] border-muted/50"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-muted-foreground">No data</p>
      </div>
    </div>
  )
}

export function CategoryBreakdownCard({
  title,
  categories,
  total,
  loading = false,
}: CategoryBreakdownCardProps) {
  const { fmt } = usePrivacyAmount()
  const isEmpty = !categories.length && !loading

  const chartData = categories.map((c, i) => ({
    categoryName: c.categoryName,
    categoryIcon: c.categoryIcon,
    categoryColor: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    total: c.total,
  }))

  return (
    <div className={cn('surface-card overflow-hidden', loading && 'opacity-70')}>
      <div className="border-b border-border/60 px-5 py-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {!loading && (
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {fmt(total)}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 md:px-6 md:py-5">
        {isEmpty ? (
          <CategoryChartPlaceholder />
        ) : (
          <CategoryDonutChart data={chartData} total={loading ? 0 : total} />
        )}

        {categories.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {categories.slice(0, 5).map((category, index) => (
              <div
                key={category.categoryId}
                className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        category.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
                    }}
                  />
                  <span className="shrink-0 text-base">{category.categoryIcon}</span>
                  <span className="truncate text-sm">{category.categoryName}</span>
                </div>
                <div className="ml-2 shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {loading ? '—' : fmt(category.total)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? '—' : `${category.percentage.toFixed(0)}%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
