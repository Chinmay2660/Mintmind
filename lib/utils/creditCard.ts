export const CARD_TYPES = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Other'] as const
export type CardType = (typeof CARD_TYPES)[number]

export function stripCardDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function detectCardType(digits: string): CardType | null {
  if (!digits) return null
  if (/^4/.test(digits)) return 'Visa'
  if (/^3[47]/.test(digits)) return 'Amex'
  if (/^5[1-5]/.test(digits)) return 'Mastercard'
  const prefix4 = parseInt(digits.slice(0, 4), 10)
  if (prefix4 >= 2221 && prefix4 <= 2720) return 'Mastercard'
  if (/^(60|65|81|82|508|353|356)/.test(digits)) return 'RuPay'
  if (digits.length >= 4) return 'Other'
  return null
}

export function formatCardNumber(digits: string): string {
  return stripCardDigits(digits).replace(/(.{4})/g, '$1 ').trim()
}

export function getLastFourDigits(digits: string): string {
  return stripCardDigits(digits).slice(-4)
}

export function maskCardNumber(digits: string): string {
  const d = stripCardDigits(digits)
  if (d.length <= 4) return d ? `•••• ${d}` : ''
  return `•••• •••• •••• ${d.slice(-4)}`
}

export const DEFAULT_CARD_COLOR = '#7c3aed'

// ponytail: self-check — upgrade path: move to a test file if more cases are added
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`creditCard: ${msg}`)
  }
  assert(detectCardType('4111111111111111') === 'Visa', 'Visa')
  assert(detectCardType('5555555555554444') === 'Mastercard', 'Mastercard 5x')
  assert(detectCardType('2221000000000009') === 'Mastercard', 'Mastercard 2x')
  assert(detectCardType('6073849700000001') === 'RuPay', 'RuPay')
  assert(getLastFourDigits('4111111111111111') === '1111', 'last four')
}
