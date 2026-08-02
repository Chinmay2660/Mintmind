import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isWithinInterval,
  isToday,
  isYesterday,
} from 'date-fns'

export type TimeView = 'daily' | 'calendar' | 'weekly' | 'monthly' | 'total'
export type TransactionType = 'income' | 'expense' | 'transfer'

export interface TransactionLike {
  _id: string
  type: TransactionType | string
  amount: number
  date: string | Date
  description?: string
  isCash?: boolean
  accountId?: { _id: string; accountName?: string } | string | null
  transferToAccountId?: { _id: string; accountName?: string } | string | null
  transferToIsCash?: boolean
  categoryId?: { _id?: string; name?: string; icon?: string; color?: string } | null
}

export interface DateRange {
  start: Date
  end: Date
}

export interface TransactionSummary {
  income: number
  expense: number
  transferIn: number
  transferOut: number
  net: number
}

export function getMonthRange(date: Date) {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

export function getDateRangeForView(view: TimeView, anchor: Date): DateRange {
  switch (view) {
    case 'daily':
      return { start: startOfDay(anchor), end: endOfDay(anchor) }
    case 'weekly':
      return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) }
    case 'monthly':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
    case 'calendar':
    case 'total':
    default:
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
  }
}

export function filterByDateRange<T extends TransactionLike>(items: T[], range: DateRange): T[] {
  return items.filter((item) => {
    const date = new Date(item.date)
    return isWithinInterval(date, range)
  })
}

export function filterBySearch<T extends TransactionLike>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const desc = item.description?.toLowerCase() ?? ''
    const cat = item.categoryId?.name?.toLowerCase() ?? ''
    const account =
      typeof item.accountId === 'object'
        ? item.accountId?.accountName?.toLowerCase() ?? ''
        : ''
    return desc.includes(q) || cat.includes(q) || account.includes(q)
  })
}

export function summarizeTransactions(items: TransactionLike[]): TransactionSummary {
  return items.reduce(
    (acc, item) => {
      if (item.type === 'income') acc.income += item.amount
      else if (item.type === 'expense') acc.expense += item.amount
      else if (item.type === 'transfer') {
        acc.transferOut += item.amount
        acc.transferIn += item.amount
      }
      acc.net = acc.income - acc.expense
      return acc
    },
    { income: 0, expense: 0, transferIn: 0, transferOut: 0, net: 0 }
  )
}

/** @deprecated use summarizeTransactions */
export function sumDayTransactions(transactions: TransactionLike[]) {
  const s = summarizeTransactions(transactions)
  return { income: s.income, expense: s.expense }
}

export function formatDateGroupHeader(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

export interface DayGroup<T extends TransactionLike> {
  dateKey: string
  label: string
  dayOfMonth: number
  transactions: T[]
  summary: TransactionSummary
}

export function groupByDay<T extends TransactionLike>(items: T[]): DayGroup<T>[] {
  const map = new Map<string, T[]>()

  for (const item of items) {
    const key = format(new Date(item.date), 'yyyy-MM-dd')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, transactions]) => {
      const date = parseISO(dateKey)
      return {
        dateKey,
        label: formatDateGroupHeader(dateKey),
        dayOfMonth: date.getDate(),
        transactions: transactions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        summary: summarizeTransactions(transactions),
      }
    })
}

/** @deprecated use groupByDay */
export function groupTransactionsByDate<T extends TransactionLike>(transactions: T[]) {
  return groupByDay(transactions).map((g) => [g.dateKey, g.transactions] as [string, T[]])
}

export interface CalendarDayData {
  date: Date
  dateKey: string
  dayOfMonth: number
  isCurrentMonth: boolean
  income: number
  expense: number
  hasTransactions: boolean
}

export function buildCalendarDays(anchor: Date, items: TransactionLike[]): CalendarDayData[] {
  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const byDay = new Map<string, TransactionSummary>()
  for (const item of items) {
    const key = format(new Date(item.date), 'yyyy-MM-dd')
    const prev = byDay.get(key) ?? { income: 0, expense: 0, transferIn: 0, transferOut: 0, net: 0 }
    if (item.type === 'income') prev.income += item.amount
    else if (item.type === 'expense') prev.expense += item.amount
    byDay.set(key, prev)
  }

  const days: CalendarDayData[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const dateKey = format(cursor, 'yyyy-MM-dd')
    const summary = byDay.get(dateKey)
    days.push({
      date: new Date(cursor),
      dateKey,
      dayOfMonth: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() === anchor.getMonth(),
      income: summary?.income ?? 0,
      expense: summary?.expense ?? 0,
      hasTransactions: Boolean(summary && (summary.income > 0 || summary.expense > 0)),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function getAccountLabel(tx: TransactionLike): string {
  if (tx.type === 'transfer') {
    const from = tx.isCash ? 'Cash' : (typeof tx.accountId === 'object' ? tx.accountId?.accountName : null) ?? 'Account'
    const to = tx.transferToIsCash
      ? 'Cash'
      : (typeof tx.transferToAccountId === 'object' ? tx.transferToAccountId?.accountName : null) ?? 'Account'
    return `${from} → ${to}`
  }
  if (tx.isCash) return 'Cash'
  return typeof tx.accountId === 'object' ? tx.accountId?.accountName ?? 'Unknown' : 'Unknown'
}

export function getTransactionTitle(tx: TransactionLike): string {
  if (tx.type === 'transfer') return 'Transfer'
  return tx.categoryId?.name || 'Uncategorized'
}

export function getTransactionSubtitle(tx: TransactionLike): string {
  const from = getAccountLabel(tx)
  const desc = tx.description?.trim()
  return desc ? `${desc} · ${from}` : from
}

export function transactionAmountClass(type: string): string {
  if (type === 'income') return 'text-green-600 dark:text-green-400'
  if (type === 'transfer') return 'text-muted-foreground'
  return 'text-red-600 dark:text-red-400'
}

export function transactionAmountPrefix(type: string): string {
  if (type === 'income') return '+'
  if (type === 'transfer') return ''
  return '-'
}
