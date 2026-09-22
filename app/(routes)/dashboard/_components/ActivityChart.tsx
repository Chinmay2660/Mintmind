'use client'

import { startOfDay } from 'date-fns'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'

interface Transaction {
  type?: string
  amount?: number
  date?: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDayIndex(dateStr: string) {
  const d = new Date(dateStr)
  return (d.getDay() + 6) % 7
}

export function ActivityChart({ transactions }: { transactions: Transaction[] }) {
  const { fmt } = usePrivacyAmount()
  const today = startOfDay(new Date())
  const totals = Array(7).fill(0)

  transactions.forEach((t) => {
    if (t.type !== 'expense' || !t.date || !t.amount) return
    const day = startOfDay(new Date(t.date))
    const diff = Math.floor((today.getTime() - day.getTime()) / 86400000)
    if (diff < 0 || diff > 6) return
    const idx = getDayIndex(t.date)
    totals[idx] += Number(t.amount)
  })

  const max = Math.max(...totals, 1)
  const hasData = totals.some((t) => t > 0)

  if (!hasData) {
    return (
      <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
        No expenses recorded this week
      </div>
    )
  }

  return (
    <div className="flex h-44 items-end justify-between gap-1.5 sm:gap-2">
      {DAY_LABELS.map((label, i) => {
        const pct = (totals[i] / max) * 100
        const barHeight = totals[i] > 0 ? Math.max(pct, 10) : 3
        const amountLabel = fmt(totals[i], { compact: true })

        return (
          <div key={label} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {totals[i] > 0 ? amountLabel : ''}
            </span>
            <div className="relative mx-auto h-32 w-full max-w-[3rem] overflow-hidden rounded-xl bg-muted/35">
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-primary/80 transition-all duration-500 group-hover:bg-primary"
                style={{ height: `${barHeight}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
