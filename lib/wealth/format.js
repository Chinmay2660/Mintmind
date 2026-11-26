// Indian-system number formatting (lakh / crore grouping).

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

/**
 * Amounts keep their paise: a whole amount shows as ₹1,200 and one with paise shows both digits (₹1,200.50), up to 2 decimal places,
 * so what was typed is what is shown. Pass { decimals: true } to always show two digits (₹1,200.00).
 */
export function formatINRPlain(n, { decimals = false } = {}) {
  const v = Number(n) || 0
  if (decimals) return inr2.format(v)
  return (Math.round(v * 100) % 100 === 0 ? inr : inr2).format(v)
}

// "Hide balances": while this is on, every amount written as text becomes the mask. The provider sets it (contexts/PrivacyContext.tsx).
// Code that must show real figures (the AI assistant's own facts, exports) uses the Plain versions.
let masked = false
export const setAmountsMasked = (on) => { masked = !!on }
export const amountsMasked = () => masked

export function formatINR(n, opts) {
  return masked ? MASK : formatINRPlain(n, opts)
}

export function formatNumber(n) {
  return num.format(Number(n) || 0)
}

/** 18,50,000 -> ₹18.5 L ; 1,05,45,000 -> ₹1.05 Cr */
export function formatCompactINRPlain(n) {
  const v = Number(n) || 0
  const a = Math.abs(v)
  const s = v < 0 ? '-' : ''
  if (a >= 1e7) return `${s}₹${trim(a / 1e7)} Cr`
  if (a >= 1e5) return `${s}₹${trim(a / 1e5)} L`
  if (a >= 1e3) return `${s}₹${trim(a / 1e3)} K`
  return `${s}₹${trim(a)}`
}

function trim(x) {
  return String(Math.round(x * 100) / 100)
}

export function formatPct(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return '-'
  const v = Number(n)
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`
}

const DATE_FORMATS = {
  'MM/DD/YYYY': { month: '2-digit', day: '2-digit', year: 'numeric' },
  'DD/MM/YYYY': { day: '2-digit', month: '2-digit', year: 'numeric' },
  'DD MMM YYYY': { day: '2-digit', month: 'short', year: 'numeric' },
}

let defaultStyle = 'DD MMM YYYY'
export function setDefaultDateStyle(style) {
  defaultStyle = style || 'DD MMM YYYY'
}

export function formatDate(iso, style = defaultStyle) {
  if (!iso) return '-'
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  // a placeholder like 0000-00-00 is not a date: it would otherwise roll back to 30 Nov 1899
  if (!(y >= 1900) || !(m >= 1) || !(d >= 1)) return '-'
  const date = new Date(y, m - 1, d)
  // A malformed stored date must not crash the page (Intl throws "Invalid time value" on an invalid Date).
  if (Number.isNaN(date.getTime())) return '-'
  if (style === 'YYYY-MM-DD') return String(iso).slice(0, 10)
  return new Intl.DateTimeFormat(style === 'MM/DD/YYYY' ? 'en-US' : 'en-GB', DATE_FORMATS[style] || DATE_FORMATS['DD MMM YYYY']).format(date)
}

export const MASK = '₹ ••••••'

/** Amounts are always written in full (₹1,85,000), never as ₹1.85 L. The name is kept so every place that asked for the short form now gets the exact one. */
export function formatCompactINR(n) {
  return masked ? MASK : formatINRPlain(n)
}

/** First letter capital: 'monthly' -> 'Monthly'. */
export const cap = (v) => (v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : v)

/** 'confirm_safe' / 'inApp' -> 'Confirm safe' / 'In app'. For showing stored codes to people. */
export const humanize = (v) => cap(String(v ?? '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())

const MODE_LABELS = { upi: 'UPI', cash: 'Cash', debit: 'Debit card', card: 'Credit card', bank: 'Net banking' }
export const modeLabel = (m) => MODE_LABELS[m] || humanize(m)
