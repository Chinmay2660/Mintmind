'use client'

import { useLayoutEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { formatDayMonth, formatDayMonthYear, formatOrdinalDay } from '@/lib/utils/format'
import { scrollPageToTop } from '@/lib/utils/scroll'
import { getDateRangeForView, type TimeView } from '@/lib/utils/transactions'

const TIME_VIEW_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'last3months', label: '3 Months' },
  { value: 'last6months', label: '6 Months' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'lifetime', label: 'Lifetime' },
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
  const isFirstRender = useRef(true)

  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    scrollPageToTop()
  }, [timeView])

  const showDateNav = timeView !== 'lifetime'
  const showArrows = !['last3months', 'last6months'].includes(timeView)

  const dateLabel =
    timeView === 'daily'
      ? formatDayMonthYear(anchorDate)
      : timeView === 'weekly'
        ? (() => {
            const { start, end } = getDateRangeForView('weekly', anchorDate)
            return `${formatDayMonth(start)} – ${formatOrdinalDay(end.getDate())} ${format(end, 'MMM, yyyy')}`
          })()
        : timeView === 'yearly'
          ? format(anchorDate, 'yyyy')
          : timeView === 'last3months' || timeView === 'last6months'
            ? (() => {
                const { start, end } = getDateRangeForView(timeView, anchorDate)
                return `${formatDayMonth(start)} – ${formatOrdinalDay(end.getDate())} ${format(end, 'MMM, yyyy')}`
              })()
              : format(anchorDate, 'yyyy MMM')

  const goToPrevious = () => {
    if (timeView === 'daily') onAnchorDateChange(subDays(anchorDate, 1))
    else if (timeView === 'weekly') onAnchorDateChange(subWeeks(anchorDate, 1))
    else if (timeView === 'yearly') onAnchorDateChange(subYears(anchorDate, 1))
    else onAnchorDateChange(subMonths(anchorDate, 1))
  }

  const goToNext = () => {
    if (timeView === 'daily') onAnchorDateChange(addDays(anchorDate, 1))
    else if (timeView === 'weekly') onAnchorDateChange(addWeeks(anchorDate, 1))
    else if (timeView === 'yearly') onAnchorDateChange(addYears(anchorDate, 1))
    else onAnchorDateChange(addMonths(anchorDate, 1))
  }

  const isNextDisabled =
    timeView === 'daily'
      ? startOfDay(anchorDate) >= startOfDay(new Date())
      : timeView === 'weekly'
        ? startOfWeek(anchorDate, { weekStartsOn: 1 }) >= startOfWeek(new Date(), { weekStartsOn: 1 })
        : timeView === 'yearly'
          ? startOfYear(anchorDate) >= startOfYear(new Date())
          : startOfMonth(anchorDate) >= startOfMonth(new Date())

  const prevAriaLabel =
    timeView === 'daily'
      ? 'Previous day'
      : timeView === 'weekly'
        ? 'Previous week'
        : timeView === 'yearly'
          ? 'Previous year'
          : 'Previous month'
  const nextAriaLabel =
    timeView === 'daily'
      ? 'Next day'
      : timeView === 'weekly'
        ? 'Next week'
        : timeView === 'yearly'
          ? 'Next year'
          : 'Next month'

  return (
    <div className="space-y-3">
      {showDateNav && (
        <div className="flex items-center justify-between">
          {showArrows ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              aria-label={prevAriaLabel}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
          <span className="text-base font-semibold text-foreground">{dateLabel}</span>
          {showArrows ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goToNext}
              aria-label={nextAriaLabel}
              disabled={isNextDisabled}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      )}

      <select
        value={timeView}
        onChange={(e) => onTimeViewChange(e.target.value as TimeView)}
        className="w-full h-10 px-3 rounded-xl border surface-input text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Time view"
      >
        {TIME_VIEW_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
