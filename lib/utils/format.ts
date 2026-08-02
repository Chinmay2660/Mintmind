import { format as formatDateFns } from 'date-fns'

export function formatCurrency(
  amount: number | string | null | undefined,
  options?: { compact?: boolean }
): string {
  const value = Number(amount) || 0
  if (options?.compact && Math.abs(value) >= 1000) {
    return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined, pattern = 'MMM dd, yyyy'): string {
  if (!date) return ''
  return formatDateFns(new Date(date), pattern)
}

export function formatNumber(num: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN').format(num || 0)
}

export function formatOrdinalDay(day: number): string {
  const n = Math.floor(day)
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const mod10 = n % 10
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}

/** e.g. "2nd Aug 2026" */
export function formatDayMonthYear(date: Date): string {
  return `${formatOrdinalDay(date.getDate())} ${formatDateFns(date, 'MMM yyyy')}`
}

/** e.g. "Sun, 2nd Aug" */
export function formatWeekdayDayMonth(date: Date): string {
  return `${formatDateFns(date, 'EEE')}, ${formatOrdinalDay(date.getDate())} ${formatDateFns(date, 'MMM')}`
}

/** e.g. "2nd Aug" */
export function formatDayMonth(date: Date): string {
  return `${formatOrdinalDay(date.getDate())} ${formatDateFns(date, 'MMM')}`
}

/** e.g. "2nd August 2026" */
export function formatDayMonthYearLong(date: Date): string {
  return `${formatOrdinalDay(date.getDate())} ${formatDateFns(date, 'MMMM yyyy')}`
}
