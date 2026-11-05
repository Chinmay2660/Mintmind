// Indian-system number formatting (lakh / crore grouping).

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export function formatINR(n, { decimals = false } = {}) {
  const v = Number(n) || 0
  return (decimals ? inr2 : inr).format(v)
}

export function formatNumber(n) {
  return num.format(Number(n) || 0)
}

/** 18,50,000 -> ₹18.5 L ; 1,05,45,000 -> ₹1.05 Cr */
export function formatCompactINR(n) {
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
  if (n == null || Number.isNaN(n)) return '—'
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
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (style === 'YYYY-MM-DD') return String(iso).slice(0, 10)
  return new Intl.DateTimeFormat(style === 'MM/DD/YYYY' ? 'en-US' : 'en-GB', DATE_FORMATS[style] || DATE_FORMATS['DD MMM YYYY']).format(date)
}

export const MASK = '₹ ••••••'

/** First letter capital: 'monthly' -> 'Monthly'. */
export const cap = (v) => (v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : v)

/** 'confirm_safe' / 'inApp' -> 'Confirm safe' / 'In app'. For showing stored codes to people. */
export const humanize = (v) => cap(String(v ?? '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())

const MODE_LABELS = { upi: 'UPI', cash: 'Cash', debit: 'Debit card', card: 'Credit card', bank: 'Net banking' }
export const modeLabel = (m) => MODE_LABELS[m] || humanize(m)
