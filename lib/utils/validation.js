/**
 * Validation utilities
 */

export const validateAmount = (amount) => {
  if (!amount || amount <= 0) {
    return 'Amount must be greater than 0'
  }
  if (amount > 1000000000) {
    return 'Amount is too large'
  }
  return null
}

export const validateRequired = (value, fieldName) => {
  if (!value || value.toString().trim() === '') {
    return `${fieldName} is required`
  }
  return null
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Invalid email address'
  }
  return null
}

export const validateDate = (date) => {
  if (!date) {
    return 'Date is required'
  }
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  return null
}

