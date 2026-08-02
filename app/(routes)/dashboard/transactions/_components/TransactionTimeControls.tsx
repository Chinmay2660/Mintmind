'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { FilterButtonGroup } from '@/components/ui/filter-button'
import type { TimeView } from '@/lib/utils/transactions'

const TIME_VIEW_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'total', label: 'Total' },
]

interface TransactionTimeControlsProps {
  timeView: TimeView
  onTimeViewChange: (view: TimeView) => void
  anchorDate: Date
  onAnchorDateChange: (date: Date) => void
}

export function TransactionTimeControls({
  timeView,
  onTimeViewChange,
  anchorDate,
  onAnchorDateChange,
}: TransactionTimeControlsProps) {
  const showMonthNav = timeView !== 'total'

  return (
    <div className="space-y-3">
      {showMonthNav && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onAnchorDateChange(subMonths(anchorDate, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-base font-semibold text-foreground">
            {format(anchorDate, 'yyyy MMM')}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onAnchorDateChange(addMonths(anchorDate, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      <FilterButtonGroup
        value={timeView}
        onValueChange={(v) => onTimeViewChange(v as TimeView)}
        options={TIME_VIEW_OPTIONS}
        className="overflow-x-auto pb-1 -mx-4 px-4 flex-nowrap"
        size="sm"
      />
    </div>
  )
}
