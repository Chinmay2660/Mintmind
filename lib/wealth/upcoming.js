// Everything that is coming up to be paid, in one list: card bills, insurance premiums, SIPs and the recurring payments the person set up.
// Each item knows the page that shows it, so a tap opens that card, that policy or that fund and not a general list.
import { upcomingCardDues, upcomingPremiums, upcomingSips, upcomingSubscriptions } from './reminders.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY = 86400000
const pad = (n) => String(n).padStart(2, '0')
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayNumber = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY) }

/** How a due date reads: Today, Tomorrow, 28 Nov, or 28 Nov 2027 when it is not this year. A date already past is Overdue. */
export function dayLabel(date, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return ''
  const t = isoOf(today)
  const days = dayNumber(date) - dayNumber(t)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  const [y, m, d] = date.split('-')
  const label = `${Number(d)} ${MONTHS[Number(m) - 1]}`
  return y === t.slice(0, 4) ? label : `${label} ${y}`
}

/** Which heading a due date sits under on the full list. */
export function dueGroup(date, today = new Date()) {
  const t = isoOf(today)
  const days = dayNumber(date) - dayNumber(t)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Today'
  if (days <= 7) return 'Next 7 days'
  return date.slice(0, 7) === t.slice(0, 7) ? 'Later this month' : 'Later'
}

export const DUE_GROUPS = ['Overdue', 'Today', 'Next 7 days', 'Later this month', 'Later']

/** All upcoming payments, soonest first. */
export function buildUpcoming({ cards = [], policies = [], sips = [], funds = [], subs = [], today = new Date() } = {}) {
  return [
    ...upcomingCardDues(cards, today).map((d) => ({ ...d, label: 'Card payment', href: `/dashboard/credit-cards?card=${encodeURIComponent(d.id)}` })),
    ...upcomingPremiums(policies, today).map((d) => ({ ...d, label: 'Premium', href: `/dashboard/insurance?policy=${encodeURIComponent(d.id)}` })),
    ...upcomingSips(sips, funds, today).map((d) => ({ ...d, label: 'SIP', href: d.fundId ? `/dashboard/mutual-funds/${encodeURIComponent(d.fundId)}` : '/dashboard/mutual-funds' })),
    ...upcomingSubscriptions(subs, today).map((d) => ({ ...d, label: 'Recurring payment' })),
  ].sort((a, b) => a.date.localeCompare(b.date) || String(a.title).localeCompare(String(b.title)))
}
