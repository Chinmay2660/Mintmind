import { shortAccountName } from './accountName.js'
import { POLICY_TYPES } from './labels.js'

const INVEST = ['mutualFunds', 'stocks', 'etf', 'fd', 'rd', 'epf', 'ppf', 'nps', 'gold', 'commodity', 'esop']
// the Investments section each kind of holding lives in, so a row opens just that section
const SECTION = { mutualFunds: 'funds', stocks: 'market', etf: 'market', fd: 'fd', rd: 'rd', epf: 'epf', ppf: 'ppf', nps: 'nps', commodity: 'gold', gold: 'gold', esop: 'esop', realEstate: 'realEstate', vehicle: 'vehicle', other: 'other' }
const num = (n) => Number(n) || 0

/**
 * Assets and liabilities as a few groups with sub-categories, the way an investing app lists them:
 *   Assets: Investments, Banks, Insurance, Real estate, Vehicle (cover is shown but is not counted in net worth)
 *   Liabilities: Credit cards, Loans
 * Each group has a total, a page it opens, and children (each with its own page). Empty groups are left out.
 * `labels` maps a breakdown key to a name.
 */
export function netWorthGroups({ assets: holdings = [], assetBreakdown = {}, bankAccounts = [], cards = [], liabilities = [], cover = 0, coverCount = 0, policies = [], funds = [], balanceHistory = [], expenses = [], cardPayments = [], todayIso = '', labels = {} }) {
  // One day's change, only where there is a daily price to measure it by: mutual funds (today's NAV against the previous one).
  const priced = funds.filter((f) => num(f.prevNav) > 0 && num(f.currentNav) > 0 && num(f.units) > 0)
  const fundDay = priced.reduce((t, f) => t + (num(f.currentNav) - num(f.prevNav)) * num(f.units), 0)
  const fundBefore = priced.reduce((t, f) => t + num(f.prevNav) * num(f.units), 0)
  const dayOf = (k) => (k === 'mutualFunds' && priced.length ? { dayChange: Math.round(fundDay * 100) / 100, dayPct: fundBefore > 0 ? Math.round((fundDay / fundBefore) * 10000) / 100 : null } : { dayChange: null, dayPct: null })
  // A bank account's change today: its balance now against its last balance before today. Zero means nothing moved, so nothing is shown.
  const bankDay = (a) => {
    if (!todayIso) return { dayChange: null, dayPct: null }
    const prev = balanceHistory.filter((h) => h.accountId === a.id && h.date < todayIso).sort((x, y) => x.date.localeCompare(y.date)).pop()
    if (!prev) return { dayChange: null, dayPct: null }
    const d = Math.round((num(a.currentBalance) - num(prev.balance)) * 100) / 100
    return d === 0 ? { dayChange: null, dayPct: null } : { dayChange: d, dayPct: num(prev.balance) > 0 ? Math.round((d / num(prev.balance)) * 10000) / 100 : null }
  }
  // A card's change today: what was charged to it minus what was paid off. More owed is not a gain, so these are marked inverted.
  const cardDay = (c) => {
    if (!todayIso) return { dayChange: null, dayPct: null, inverted: true }
    const charged = expenses.filter((e) => e.mode === 'card' && e.cardId === c.id && String(e.date).slice(0, 10) === todayIso).reduce((t, e) => t + num(e.amount), 0)
    const paid = cardPayments.filter((p) => p.cardId === c.id && String(p.date).slice(0, 10) === todayIso).reduce((t, p) => t + num(p.amount), 0)
    const d = Math.round((charged - paid) * 100) / 100
    return { dayChange: d === 0 ? null : d, dayPct: null, inverted: true }
  }
  const fromBreakdown = (keys, href) => keys.filter((k) => num(assetBreakdown[k]) > 0).map((k) => ({ key: k, kind: k, label: labels[k] ?? k, value: num(assetBreakdown[k]), ...dayOf(k), href: SECTION[k] ? `/dashboard/mutual-funds?tab=${SECTION[k]}` : href }))
  // vehicles are listed by kind (Car, Bike/Scooty), not as one "Vehicle" row
  const vehicleKinds = [...new Set(holdings.filter((a) => a.category === 'vehicle').map((a) => a.vehicleType || 'Other'))]
    .map((t) => ({ key: 'vehicle-' + t, kind: 'vehicle', label: t, value: holdings.filter((a) => a.category === 'vehicle' && (a.vehicleType || 'Other') === t).reduce((n, a) => n + num(a.value), 0), href: '/dashboard' }))
    .filter((c) => c.value > 0)
  const group = (key, label, href, children, extra = {}) => ({ key, label, href, children, value: children.reduce((s, c) => s + c.value, 0), uncounted: false, note: '', ...extra })

  const assets = [
    group('invest', 'Investments', '/dashboard/mutual-funds', fromBreakdown(INVEST, '/dashboard/mutual-funds')),
    group('banks', 'Banks', '/dashboard/bank-accounts', bankAccounts.filter((a) => num(a.currentBalance) > 0).sort((a, b) => num(b.currentBalance) - num(a.currentBalance)).map((a) => ({ key: a.id, kind: a.type === 'cash' ? 'cash' : 'bank', ...bankDay(a), label: shortAccountName(a, bankAccounts), value: num(a.currentBalance), href: a.type === 'cash' ? '/dashboard/bank-accounts' : `/dashboard/bank-accounts/${a.id}` }))),
    // cover is what the policies would pay out, not money you hold, so it is listed without being added to the total
    group('insurance', 'Insurance', '/dashboard/insurance', POLICY_TYPES.map((t) => ({ key: 'type-' + t.value, kind: t.value, label: t.label, value: policies.filter((p) => p.type === t.value).reduce((n, p) => n + num(p.sumAssured), 0), href: '/dashboard/insurance?type=' + t.value })).filter((c) => c.value > 0), { uncounted: true, note: `${coverCount} active polic${coverCount === 1 ? 'y' : 'ies'} · cover only` }),
    ...['realEstate', 'vehicle', 'other'].map((k) => group(k, labels[k] ?? k, '/dashboard', k === 'vehicle' ? vehicleKinds : fromBreakdown([k], '/dashboard/mutual-funds'))),
  ].filter((g) => g && (g.value > 0))

  const liabilityGroups = [
    group('cards', 'Credit cards', '/dashboard/credit-cards', cards.filter((c) => num(c.outstanding) > 0).map((c) => ({ key: c.id, kind: 'card', ...cardDay(c), label: `${c.bank} ${c.cardName}`, value: num(c.outstanding), href: `/dashboard/credit-cards?card=${c.id}` }))),
    group('loans', 'Loans', '/dashboard/net-worth/loans', liabilities.filter((l) => num(l.outstanding) > 0).map((l) => ({ key: l.id, kind: l.category || 'loan', label: l.name, value: num(l.outstanding), href: '/dashboard/net-worth/loans' }))),
  ].filter((g) => g.value > 0)

  return { assets, liabilities: liabilityGroups }
}
