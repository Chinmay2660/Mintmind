'use client'

import { Suspense, useMemo, useState } from 'react'
import { subMonths } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useAuth } from '@/lib/hooks/useAuth'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { PageHeader } from '@/components/ui/PageHeader'
import { ChartCard } from '@/components/ui/chart-card'
import { FinanceStatCard } from '@/components/ui/finance-stat-card'
import { TabButtonGroup } from '@/components/ui/tab-button'
import { formatCurrency } from '@/lib/utils/format'

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'MAX'

interface Investment {
  amount: number
  currentValue?: number
  investedDate: string
}

const RANGE_OPTIONS = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'MAX', label: 'MAX' },
]

function getCutoff(range: TimeRange) {
  if (range === 'MAX') return null
  const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range]
  return subMonths(new Date(), months)
}

function PerformanceContent() {
  const { user } = useAuth()
  const { data: investments, loading, reload } = useLocalList<Investment>('investments', user?.id)
  const [range, setRange] = useState<TimeRange>('1Y')

  useSyncedRefresh(reload)

  const filtered = useMemo(() => {
    const cutoff = getCutoff(range)
    const sorted = [...investments].sort(
      (a, b) => new Date(a.investedDate).getTime() - new Date(b.investedDate).getTime()
    )
    if (!cutoff) return sorted
    return sorted.filter((inv) => new Date(inv.investedDate) >= cutoff)
  }, [investments, range])

  const totalInvested = filtered.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const totalCurrent = filtered.reduce(
    (sum, inv) => sum + (inv.currentValue || inv.amount || 0),
    0
  )
  const totalGain = totalCurrent - totalInvested
  const returnPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  const chartData = useMemo(() => {
    let cumulativeInvested = 0
    let cumulativeCurrent = 0
    const points = filtered.map((inv) => {
      cumulativeInvested += inv.amount || 0
      cumulativeCurrent += inv.currentValue || inv.amount || 0
      const date = new Date(inv.investedDate)
      return {
        date: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        invested: cumulativeInvested,
        current: cumulativeCurrent,
      }
    })
    if (points.length === 0) return points
    const last = points[points.length - 1]
    if (last.invested !== totalInvested || last.current !== totalCurrent) {
      points.push({
        date: 'Now',
        invested: totalInvested,
        current: totalCurrent,
      })
    }
    return points
  }, [filtered, totalInvested, totalCurrent])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Performance"
        subtitle="Track invested vs current value over time"
        showBack
        backHref="/dashboard/investments"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceStatCard title="Total Invested" value={totalInvested} loading={loading} />
        <FinanceStatCard
          title="Current Value"
          value={totalCurrent}
          variant="success"
          loading={loading}
        />
        <FinanceStatCard
          title="Total Gain/Loss"
          value={totalGain}
          variant={totalGain >= 0 ? 'success' : 'danger'}
          loading={loading}
        />
        <FinanceStatCard
          title="Return"
          value={returnPct}
          format="percent"
          variant={returnPct >= 0 ? 'success' : 'danger'}
          loading={loading}
        />
      </div>

      <ChartCard
        title="Portfolio Growth"
        subtitle="Cumulative invested vs current value"
        loading={loading}
        action={
          <TabButtonGroup value={range} onValueChange={(v) => setRange(v as TimeRange)} options={RANGE_OPTIONS} />
        }
      >
        {chartData.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            No investments in this period
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => formatCurrency(v, { compact: true })}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '13px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="invested"
                  name="Invested"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="Current Value"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  )
}

export default function PerformancePage() {
  return (
    <Suspense fallback={null}>
      <PerformanceContent />
    </Suspense>
  )
}
