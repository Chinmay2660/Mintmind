'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

const FALLBACK_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

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
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              fontSize: '13px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-lg font-bold text-foreground">{formatCurrency(total)}</p>
      </div>
    </div>
  )
}
