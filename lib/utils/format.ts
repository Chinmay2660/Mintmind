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

/** Next calendar date on or after `from` with day-of-month `day` (1–31). */
export function nextDateForDayOfMonth(day: number, from = new Date()): Date {
  const d = Math.min(Math.max(1, Math.floor(day)), 31)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let candidate = new Date(from.getFullYear(), from.getMonth(), d)
  if (candidate < today) {
    candidate = new Date(from.getFullYear(), from.getMonth() + 1, d)
  }
  return candidate
}

function clampDayOfMonth(day: number): number {
  return Math.min(Math.max(1, Math.floor(day)), 31)
}

function dueDateForStatement(statementDay: number, dueDay: number, statementDate: Date): Date {
  const due = clampDayOfMonth(dueDay)
  const stmt = clampDayOfMonth(statementDay)
  if (due > stmt) {
    return new Date(statementDate.getFullYear(), statementDate.getMonth(), due)
  }
  return new Date(statementDate.getFullYear(), statementDate.getMonth() + 1, due)
}

/** Statement + due for the billing cycle relevant to `from` (defaults to today). */
export function getBillingCycleDates(
  statementDay: number,
  dueDay: number,
  from = new Date(),
): { statement: Date; due: Date } {
  const stmtDay = clampDayOfMonth(statementDay)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let statement = new Date(from.getFullYear(), from.getMonth(), stmtDay)

  if (today > statement) {
    const cycleDue = dueDateForStatement(statementDay, dueDay, statement)
    if (today > cycleDue) {
      statement = new Date(from.getFullYear(), from.getMonth() + 1, stmtDay)
    }
  }

  return { statement, due: dueDateForStatement(statementDay, dueDay, statement) }
}

/** Upcoming statement date for the billing cycle relevant to `from`. */
export function getBillingStatementDate(statementDay: number, from = new Date()): Date {
  return getBillingCycleDates(statementDay, statementDay, from).statement
}

/** Due date for the billing cycle relevant to `from`. */
export function getBillingDueDate(statementDay: number, dueDay: number, from = new Date()): Date {
  return getBillingCycleDates(statementDay, dueDay, from).due
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
