'use client'

import { startOfDay } from 'date-fns'

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
      <div className="flex items-center justify-center h-36 md:h-44 lg:h-48 rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
        No expenses recorded this week
      </div>
    )
  }

  return (
    <div className="flex items-end justify-between gap-2 md:gap-3 h-36 md:h-44 lg:h-48">
      {DAY_LABELS.map((label, i) => {
        const pct = (totals[i] / max) * 100
        const barHeight = totals[i] > 0 ? Math.max(pct, 12) : 4
        return (
          <div key={label} className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className="relative w-full max-w-[28px] sm:max-w-[36px] md:max-w-[48px] lg:max-w-[64px] h-full min-h-[100px] md:min-h-[120px] lg:min-h-[140px] rounded-xl bg-primary/10 border border-primary/20 overflow-hidden mx-auto">
              <div
                className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-lg transition-all duration-500"
                style={{ height: `${barHeight}%` }}
              />
            </div>
            <span className="text-[11px] md:text-xs text-muted-foreground font-medium">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
