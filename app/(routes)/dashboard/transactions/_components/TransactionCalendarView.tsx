'use client'

import { formatCurrency, formatOrdinalDay } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { CalendarDayData } from '@/lib/utils/transactions'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface TransactionCalendarViewProps {
  days: CalendarDayData[]
  selectedDateKey: string | null
  onSelectDate: (dateKey: string) => void
}

export function TransactionCalendarView({
  days,
  selectedDateKey,
  onSelectDate,
}: TransactionCalendarViewProps) {
  return (
    <div className="surface-card p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onSelectDate(day.dateKey)}
            className={cn(
              'flex flex-col items-center rounded-lg p-1.5 min-h-[52px] transition-colors',
              day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
              selectedDateKey === day.dateKey && 'bg-primary/15 ring-1 ring-primary',
              day.hasTransactions && selectedDateKey !== day.dateKey && 'bg-muted/60'
            )}
          >
            <span className="text-xs font-medium">{formatOrdinalDay(day.dayOfMonth)}</span>
            {day.expense > 0 && (
              <span className="text-[9px] text-red-500 truncate w-full text-center">
                -{formatCurrency(day.expense, { compact: true })}
              </span>
            )}
            {day.income > 0 && (
              <span className="text-[9px] text-blue-500 truncate w-full text-center">
                +{formatCurrency(day.income, { compact: true })}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
