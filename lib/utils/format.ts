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
