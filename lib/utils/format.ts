import { format as formatDateFns } from 'date-fns'

export function formatCurrency(amount: number | string | null | undefined): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export function formatDate(date: string | Date | null | undefined, pattern = 'MMM dd, yyyy'): string {
  if (!date) return ''
  return formatDateFns(new Date(date), pattern)
}

export function formatNumber(num: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN').format(num || 0)
}
