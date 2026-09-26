'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'

const FALLBACK_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#ec4899', '#f59e0b', '#6366f1', '#8b5cf6', '#ef4444']

interface CategoryItem {
  categoryName: string
  categoryIcon?: string
  categoryColor?: string
  total: number
}

interface CategoryDonutChartProps {
  data: CategoryItem[]
  total: number
}

export function CategoryDonutChart({ data, total }: CategoryDonutChartProps) {
  const { fmt } = usePrivacyAmount()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (!data.length || total <= 0) {
    return (
      <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
        No data for this period
      </div>
    )
  }

  const chartData = data.slice(0, 8).map((item, i) => ({
    name: item.categoryName,
    value: item.total,
    color: item.categoryColor || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))

  // Hovered slice replaces the centre total instead of a floating tooltip, which collided with it.
  const active = activeIndex != null ? chartData[activeIndex] : null

  return (
    <div className="relative h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
            onMouseEnter={(_, i) => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                fillOpacity={activeIndex == null || activeIndex === i ? 1 : 0.35}
                className="cursor-pointer transition-opacity"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[26%] text-center"
        aria-live="polite"
      >
        <p className="w-full truncate text-xs text-muted-foreground">{active ? active.name : 'Total'}</p>
        <p className="text-lg font-bold tabular-nums text-foreground">{fmt(active ? active.value : total)}</p>
        {active && (
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {Math.round((active.value / total) * 100)}%
          </p>
        )}
      </div>
    </div>
  )
}
