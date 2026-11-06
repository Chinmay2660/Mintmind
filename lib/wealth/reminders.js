// Derives upcoming dues / alerts from real data. Nothing is fabricated: no data -> no notifications.
import { toISO, parseDate, nextSipDate, budgetPacing, daysInMonth } from './calc.js'

const DAY = 86400000
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY)

/** Next occurrence of a day-of-month on/after `from`. */
export function nextDayOfMonth(day, from = new Date()) {
  const f = parseDate(from)
  let y = f.getFullYear()
  let m = f.getMonth()
  let d = Math.min(day, daysInMonth(y, m + 1))
  if (d < f.getDate()) {
    m += 1
    if (m > 11) {
      m = 0
      y += 1
    }
    d = Math.min(day, daysInMonth(y, m + 1))
  }
  return toISO(new Date(y, m, d))
}

export function upcomingCardDues(cards, today = new Date()) {
  return cards
    .filter((c) => c.outstanding > 0 && c.dueDay)
    .map((c) => {
      const date = nextDayOfMonth(c.dueDay, today)
      return { kind: 'card', id: c.id, date, daysLeft: daysBetween(today, date), title: `${c.bank} ${c.cardName}`, amount: c.outstanding, href: '/dashboard/credit-cards' }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function upcomingPremiums(policies, today = new Date()) {
  return policies
    .filter((p) => p.nextPremium)
    .map((p) => ({
      kind: 'premium', id: p.id, date: p.nextPremium, daysLeft: daysBetween(today, p.nextPremium),
      title: `${p.company} - ${p.policyName}`, amount: p.premium, href: '/dashboard/insurance',
    }))
    .filter((p) => p.daysLeft <= 60)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function upcomingSips(sips, funds, today = new Date()) {
  return sips
    .map((s) => {
      const date = nextSipDate(s, today)
      if (!date) return null
      const f = funds.find((x) => x.id === s.fundId)
      return { kind: 'sip', id: s.id, date, daysLeft: daysBetween(today, date), title: f?.name || 'SIP', amount: s.amount, href: '/dashboard/mutual-funds' }
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function expiringPolicies(policies, today = new Date()) {
  return policies
    .filter((p) => p.endDate && p.frequency !== 'monthly')
    .map((p) => ({ kind: 'expiry', id: p.id, date: p.endDate, daysLeft: daysBetween(today, p.endDate), title: `${p.policyName} expires`, href: '/dashboard/insurance' }))
    .filter((p) => p.daysLeft >= 0 && p.daysLeft <= 45)
}

const MODULE = { card: 'Cards', statement: 'Cards', util: 'Cards', premium: 'Insurance', expiry: 'Insurance', sip: 'Mutual Funds', sipend: 'Mutual Funds', nav: 'Mutual Funds', budget: 'Budget & Expenses', nobudget: 'Budget & Expenses', lowbal: 'Bank Accounts', stale: 'Net Worth', legacy: 'Digital Legacy', family: 'Family Circle' }
export const moduleOf = (kind) => MODULE[kind] || 'Mintmind'

const sev = (daysLeft, high, mid) => (daysLeft <= high ? 'high' : daysLeft <= mid ? 'medium' : 'low')

/**
 * Reminders across every module, derived only from the user's own data (no data -> no notifications).
 * kinds: card (payment due), statement, util, premium, expiry, sip, sipend, nav (stale NAV), budget, nobudget,
 *        lowbal (below MAB), stale (old manual value), legacy, family
 */
export function buildNotifications({ cards = [], policies = [], sips = [], funds = [], expenses = [], budgets = [], bankAccounts = [], assets = [], members = [], legacy = null }, today = new Date()) {
  const out = []
  const t = parseDate(today)
  const ym = toISO(t).slice(0, 7)
  const push = (n) => out.push({ module: moduleOf(n.kind), daysLeft: 0, ...n })

  // Credit cards: payment due, statement day, high utilisation
  for (const c of upcomingCardDues(cards, today)) if (c.daysLeft <= 7) push({ ...c, severity: sev(c.daysLeft, 2, 7), title: 'Pay ' + c.title })
  for (const c of cards) {
    if (c.statementDay) {
      const date = nextDayOfMonth(c.statementDay, today)
      const daysLeft = daysBetween(today, date)
      if (daysLeft <= 3) push({ kind: 'statement', id: c.id, date, daysLeft, severity: 'low', title: c.bank + ' ' + c.cardName + ' statement generates', href: '/dashboard/credit-cards' })
    }
    const util = c.limit > 0 ? (c.outstanding / c.limit) * 100 : 0
    if (util >= 70) push({ kind: 'util', id: c.id, severity: util >= 90 ? 'high' : 'medium', title: c.cardName + ' utilisation is ' + Math.round(util) + '%', href: '/dashboard/credit-cards' })
  }

  // Insurance: premiums (incl. overdue) and expiries
  for (const p of upcomingPremiums(policies, today)) if (p.daysLeft <= 30) push({ ...p, severity: sev(p.daysLeft, 7, 30), title: 'Premium: ' + p.title })
  for (const e of expiringPolicies(policies, today)) push({ ...e, severity: sev(e.daysLeft, 15, 45) })

  // Mutual funds: SIP debits, SIPs ending, stale manual NAVs
  for (const s of upcomingSips(sips, funds, today)) if (s.daysLeft <= 3) push({ ...s, severity: 'low', title: 'SIP: ' + s.title })
  for (const s of sips) {
    const left = s.instalmentsTotal - s.instalmentsCompleted
    if (s.status === 'active' && s.instalmentsTotal > 0 && left <= 2 && left >= 0) {
      const f = funds.find((x) => x.id === s.fundId)
      push({ kind: 'sipend', id: s.id, severity: 'low', title: 'SIP ending soon: ' + (f ? f.name : 'fund'), href: '/dashboard/mutual-funds' })
    }
  }
  const stale = funds.filter((f) => f.navDate && f.navSource !== 'market' && daysBetween(f.navDate, today) > 7)
  if (stale.length) push({ kind: 'nav', id: 'nav', date: ym, severity: 'low', title: stale.length + (stale.length > 1 ? ' fund NAVs are' : ' fund NAV is') + ' more than a week old', href: '/dashboard/mutual-funds' })

  // Budget: set one, pace, utilisation, category limits
  const b = budgets.find((x) => x.id === ym)
  if (!b) push({ kind: 'nobudget', id: ym, severity: 'low', title: 'Set this month’s budget', href: '/dashboard/budget' })
  if (b && b.total > 0) {
    const p = budgetPacing({ budget: b.total, expenses, year: t.getFullYear(), month: t.getMonth() + 1, today })
    if (p.utilisation >= 90) push({ kind: 'budget', id: 'budget', severity: 'high', title: p.utilisation >= 100 ? 'Budget exceeded' : 'Budget at ' + Math.round(p.utilisation) + '%', href: '/dashboard/budget' })
    else if (p.variance > 0 && p.utilisation >= 60) push({ kind: 'budget', id: 'budget', severity: 'medium', title: 'Spending ahead of monthly pace', href: '/dashboard/budget' })
    const spent = {}
    for (const e of expenses) if (String(e.date).slice(0, 7) === ym) spent[e.category] = (spent[e.category] || 0) + (Number(e.amount) || 0)
    for (const [cat, lim] of Object.entries(b.categories || {})) if (lim > 0 && (spent[cat] || 0) > lim) push({ kind: 'budget', id: 'cat-' + cat, severity: 'medium', title: cat + ' is over its category budget', href: '/dashboard/budget' })
  }

  // Bank accounts: below minimum balance
  for (const a of bankAccounts) {
    if (a.type !== 'cash' && a.mab > 0 && a.currentBalance < a.mab) push({ kind: 'lowbal', id: a.id, severity: 'high', title: (a.nickname || a.bankName) + ' is ₹' + Math.round(a.mab - a.currentBalance).toLocaleString('en-IN') + ' below its minimum balance', href: '/dashboard/bank-accounts/' + a.id })
  }

  // Net worth: manual values that have not been refreshed in 90 days
  const old = assets.filter((a) => a.source !== 'kite' && a.updated && daysBetween(a.updated, today) > 90)
  if (old.length) push({ kind: 'stale', id: 'stale', date: ym, severity: 'low', title: old.length + (old.length > 1 ? ' asset values' : ' asset value') + ' not updated in 90+ days', href: '/dashboard/net-worth' })

  // Digital legacy: needs your confirmation / a contact has not accepted
  const L = Array.isArray(legacy) ? legacy[0] : legacy
  if (L && L.enabled) {
    if (L.state && L.state !== 'monitoring') push({ kind: 'legacy', id: 'confirm', severity: 'high', title: 'Confirm you are safe: your legacy plan has started', href: '/dashboard/vault?tab=legacy' })
    for (const c of L.contacts || []) if (!c.accepted) push({ kind: 'legacy', id: 'c-' + c.id, severity: 'low', title: c.name + ' hasn’t accepted the legacy invitation', href: '/dashboard/vault?tab=legacy' })
  }

  // Family circle: invitations still pending
  for (const m of members) if (m.status === 'pending' || m.status === 'invited') push({ kind: 'family', id: m.id, severity: 'low', title: m.name + ' hasn’t accepted the family invitation', href: '/dashboard/family' })

  const rank = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b2) => rank[a.severity] - rank[b2.severity] || a.daysLeft - b2.daysLeft)
}
