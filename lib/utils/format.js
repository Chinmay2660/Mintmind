/**
 * Format currency amount
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

/**
 * Format date
 */
export const formatDate = (date, format = 'MMM dd, yyyy') => {
  if (!date) return ''
  const { format: formatDate } = require('date-fns')
  return formatDate(new Date(date), format)
}

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(num || 0)
}

