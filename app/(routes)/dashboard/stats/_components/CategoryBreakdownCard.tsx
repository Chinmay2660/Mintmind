'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'
import { CategoryDonutChart } from '../../_components/CategoryDonutChart'

const FALLBACK_COLORS = [
  '#2563eb', '#3b82f6', '#60a5fa', '#ec4899', '#f59e0b',
  '#ef4444', '#8b5cf6', '#10b981', '#f97316',
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

export function CategoryBreakdownCard({
  title,
  categories,
  total,
  loading = false,
}: CategoryBreakdownCardProps) {
  if (!categories.length && !loading) return null

  const chartData = categories.map((c, i) => ({
    categoryName: c.categoryName,
    categoryIcon: c.categoryIcon,
    categoryColor: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    total: c.total,
  }))

  return (
    <div className={cn('surface-card p-6 transition-opacity', loading && 'opacity-60')}>
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <CategoryDonutChart data={chartData} total={loading ? 0 : total} />

      {categories.length > 0 && (
        <div className="mt-4 space-y-2">
          {categories.map((category, index) => (
            <div
              key={category.categoryId}
              className="flex items-center justify-between p-2 rounded-lg surface-inner"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{
                    backgroundColor:
                      category.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
                  }}
                />
                <span className="text-lg shrink-0">{category.categoryIcon}</span>
                <span className="font-medium text-sm truncate">{category.categoryName}</span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="font-bold text-sm">
                  {loading ? '—' : formatCurrency(category.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loading ? '—' : `${category.percentage.toFixed(1)}%`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
