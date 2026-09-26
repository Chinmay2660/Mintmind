'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'
import { monthlyCashFlow } from '@/lib/utils/dashboardInsights'

interface Transaction {
  type?: string
  amount?: number
  date?: string
}

const SERIES = [
  { key: 'income', label: 'Income', color: 'hsl(var(--primary))' },
  { key: 'expense', label: 'Expenses', color: 'hsl(var(--warning))' },
] as const

export function CashFlowChart({ transactions }: { transactions: Transaction[] }) {
  const { fmt, privacyMode } = usePrivacyAmount()
  const data = monthlyCashFlow(transactions)

  if (!data.some((m) => m.income > 0 || m.expense > 0)) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
        No income or expenses in the last 6 months
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="h-64" role="img" aria-label="Income and expenses over the last 6 months">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`cf-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={privacyMode ? 0 : 56}
              tick={privacyMode ? false : { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(v) => fmt(Number(v), { compact: true })}
            />
            <Tooltip
              formatter={(value, name) => [fmt(Number(value)), SERIES.find((s) => s.key === name)?.label ?? name]}
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '4 4' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '13px',
                color: 'hsl(var(--popover-foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.key === 'expense' ? '5 4' : undefined}
                fill={`url(#cf-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
