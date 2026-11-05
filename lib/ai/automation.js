// Automation engine: simple predefined templates (no workflow builder). Rules are evaluated against deterministic
// facts; a rule can only NOTIFY. Automations never move money, place investment orders or edit financial records.
import { addMonths, toISO } from '../wealth/calc.js'
import { formatINR } from '../wealth/format.js'

const inr = (n) => formatINR(n)

export const FREQUENCIES = [{ v: 'daily', l: 'Daily' }, { v: 'weekly', l: 'Weekly' }, { v: 'monthly', l: 'Monthly' }]
export const CHANNELS = [{ v: 'inApp', l: 'In-app' }, { v: 'email', l: 'Email' }, { v: 'sms', l: 'SMS' }, { v: 'push', l: 'Push' }]

// Each template: group, label, params (name -> {label, default, unit}), defaults for frequency, and evaluate(facts, params, data, now).
export const TEMPLATES = {
  // ---- Budget ----
  'budget-daily': { group: 'Budget', label: 'Daily budget summary', frequency: 'daily', params: {}, evaluate: (f) => f.budget ? hit(`Daily budget (${f.budget.label})`, `Day ${f.budget.dayToday}: spent ${inr(f.budget.spent)} vs expected ${inr(f.budget.expectedTillToday)}. You can spend about ${inr(f.budget.allowanceToday)} today and stay on pace.`) : miss('No budget set.') },
  'budget-weekly': { group: 'Budget', label: 'Weekly spending report', frequency: 'weekly', params: {}, evaluate: (f) => f.budget ? hit('Weekly spending report', `${f.budget.label} so far: ${inr(f.budget.spent)} spent (${f.budget.utilisationPct}% of budget). Largest category: ${f.budget.topCategory ? `${f.budget.topCategory.name} ${inr(f.budget.topCategory.spent)}` : 'none yet'}.`) : miss('No budget set.') },
  'budget-pace': { group: 'Budget', label: 'Spending ahead of plan', frequency: 'daily', params: { threshold: { label: 'Alert when spending is above', default: 80, unit: '% of expected pace' } }, evaluate: (f, p) => f.budget && f.budget.expectedTillToday > 0 && (f.budget.spent / f.budget.expectedTillToday) * 100 >= p.threshold ? hit('Budget alert', `You have spent ${inr(f.budget.spent)}, which is ${Math.round((f.budget.spent / f.budget.expectedTillToday) * 100)}% of the ${inr(f.budget.expectedTillToday)} expected by today.`) : miss('Within threshold.') },
  'budget-category': { group: 'Budget', label: 'Category budget threshold', frequency: 'daily', params: { threshold: { label: 'Alert when a category reaches', default: 90, unit: '% of its limit' } }, evaluate: (f, p) => { const c = (f.budget?.categories || []).filter((x) => x.limit > 0 && (x.utilisationPct ?? 0) >= p.threshold); return c.length ? hit('Category budget alert', c.map((x) => `${x.name} is at ${Math.round(x.utilisationPct)}% (${inr(x.spent)} of ${inr(x.limit)})`).join('; ') + '.') : miss('No category over threshold.') } },
  'budget-monthend': { group: 'Budget', label: 'Month-end budget summary', frequency: 'monthly', params: {}, evaluate: (f) => f.budget && f.budget.remainingDays <= 1 ? hit(`${f.budget.label} budget summary`, `You spent ${inr(f.budget.spent)} of ${inr(f.budget.total)} (${f.budget.utilisationPct}%). ${f.budget.remaining >= 0 ? `${inr(f.budget.remaining)} left.` : `${inr(-f.budget.remaining)} over budget.`}`) : miss('Not month end.') },
  // ---- Cards ----
  'card-due': { group: 'Cards', label: 'Card payment due reminder', frequency: 'daily', params: { days: { label: 'Remind when due within', default: 3, unit: 'days' } }, evaluate: (f, p) => { const d = f.cards.perCard.filter((c) => c.due && c.due.daysLeft <= p.days); return d.length ? hit('Card payment due', d.map((c) => `${c.name}: ${inr(c.outstanding)} due ${c.due.daysLeft === 0 ? 'today' : `in ${c.due.daysLeft} days`}`).join('; ') + '.') : miss('Nothing due soon.') } },
  'card-util': { group: 'Cards', label: 'High utilisation alert', frequency: 'weekly', params: { threshold: { label: 'Alert at utilisation above', default: 70, unit: '%' } }, evaluate: (f, p) => f.cards.limit > 0 && f.cards.utilisationPct >= p.threshold ? hit('High card utilisation', `Overall utilisation is ${f.cards.utilisationPct}% (${inr(f.cards.outstanding)} of ${inr(f.cards.limit)}).`) : miss('Below threshold.') },
  'card-outstanding': { group: 'Cards', label: 'Outstanding balance reminder', frequency: 'monthly', params: {}, evaluate: (f) => f.cards.outstanding > 0 ? hit('Card outstanding', `Total credit card outstanding is ${inr(f.cards.outstanding)}.`) : miss('No outstanding.') },
  // ---- Insurance ----
  'ins-premium': { group: 'Insurance', label: 'Premium due reminder', frequency: 'daily', params: { days: { label: 'Remind when due within', default: 7, unit: 'days' } }, evaluate: (f, p) => { const d = f.insurance.upcomingPremiums.filter((x) => x.daysLeft <= p.days); return d.length ? hit('Premium due', d.map((x) => `${x.title}: ${inr(x.amount)} ${x.daysLeft < 0 ? 'overdue' : `in ${x.daysLeft} days`}`).join('; ') + '.') : miss('Nothing due soon.') } },
  'ins-expiry': { group: 'Insurance', label: 'Policy expiry / renewal reminder', frequency: 'weekly', params: { days: { label: 'Remind when expiring within', default: 30, unit: 'days' } }, evaluate: (f, p) => { const d = f.insurance.expiring.filter((x) => x.daysLeft <= p.days); return d.length ? hit('Policy expiring', d.map((x) => `${x.title} on ${x.date}`).join('; ') + '. Plan the renewal.') : miss('No policy expiring.') } },
  'ins-document': { group: 'Insurance', label: 'Missing policy document reminder', frequency: 'monthly', params: {}, evaluate: (f, p, data) => { const m = (data.policies || []).filter((x) => !x.documentId); return m.length ? hit('Policy documents missing', `${m.length} polic${m.length > 1 ? 'ies have' : 'y has'} no attached document: ${m.map((x) => x.policyName).join(', ')}.`) : miss('All policies have documents.') } },
  // ---- Mutual funds ----
  'mf-sip-reminder': { group: 'Mutual Funds', label: 'SIP debit reminder', frequency: 'daily', params: { days: { label: 'Remind when debit within', default: 2, unit: 'days' } }, evaluate: (f, p, data, now) => { const d = sipsDue(data, now, p.days); return d.length ? hit('SIP debit coming up', d.map((x) => `${x.name} ${inr(x.amount)} on ${x.date}`).join('; ') + '. Keep funds in the account.') : miss('No SIP debit soon.') } },
  'mf-sip-summary': { group: 'Mutual Funds', label: 'Monthly SIP summary', frequency: 'monthly', params: {}, evaluate: (f) => f.funds.activeSips ? hit('Monthly SIP summary', `${f.funds.activeSips} active SIPs with a monthly commitment of ${inr(f.funds.sipMonthly)}. Invested this month: ${inr(f.funds.monthChange?.contributions ?? 0)}.`) : miss('No active SIPs.') },
  'mf-portfolio': { group: 'Mutual Funds', label: 'Monthly portfolio summary', frequency: 'monthly', params: {}, evaluate: (f) => f.funds.summary.fundCount ? hit('Portfolio summary', `Value ${inr(f.funds.summary.value)} on ${inr(f.funds.summary.invested)} invested (${f.funds.summary.absReturn >= 0 ? '+' : '-'}${inr(Math.abs(f.funds.summary.absReturn))}).`) : miss('No funds.') },
  'mf-nav': { group: 'Mutual Funds', label: 'Valuation update reminder', frequency: 'weekly', params: { days: { label: 'Remind when NAV is older than', default: 7, unit: 'days' } }, evaluate: (f, p, data, now) => { const s = (data.funds || []).filter((x) => x.navDate && x.navSource !== 'kite' && days(x.navDate, now) > p.days); return s.length ? hit('Update fund NAVs', `${s.length} fund NAV${s.length > 1 ? 's are' : ' is'} older than ${p.days} days, so portfolio value may be out of date.`) : miss('NAVs are current.') } },
  // ---- Bank ----
  'bank-balance-update': { group: 'Bank Accounts', label: 'Monthly balance update reminder', frequency: 'monthly', params: {}, evaluate: (f, p, data) => hit('Update your balances', `Check your bank statements and update ${f.banks.accounts.filter((a) => a.type !== 'cash').length} account balance(s) so your net worth stays accurate.`) },
  'bank-threshold': { group: 'Bank Accounts', label: 'Low balance notification', frequency: 'daily', params: { amount: { label: 'Notify when an account is below', default: 10000, unit: '₹' } }, evaluate: (f, p) => { const l = f.banks.accounts.filter((a) => a.balance < Math.max(p.amount, a.mab || 0)); return l.length ? hit('Low balance', l.map((a) => `${a.name}: ${inr(a.balance)}`).join('; ') + '.') : miss('Balances are fine.') } },
  'bank-unusual': { group: 'Bank Accounts', label: 'Large transaction alert', frequency: 'daily', params: { amount: { label: 'Alert on any expense of', default: 25000, unit: '₹ or more' } }, evaluate: (f, p, data, now) => { const t = toISO(now); const big = (data.expenses || []).filter((e) => e.date >= addDays(t, -1) && Number(e.amount) >= p.amount); return big.length ? hit('Large transaction', big.map((e) => `${inr(e.amount)} on ${e.category} (${e.date})`).join('; ') + '. If this was not you, review your accounts.') : miss('No large transactions.') } },
  'bank-summary': { group: 'Bank Accounts', label: 'Monthly bank summary', frequency: 'monthly', params: {}, evaluate: (f) => hit('Monthly bank summary', `Total bank and cash balance is ${inr(f.banks.total)} across ${f.banks.accounts.length} accounts. This month: income ${inr(f.money.thisMonth.income)}, expenses ${inr(f.money.thisMonth.expense)}.`) },
  // ---- Family ----
  'family-report': { group: 'Family', label: 'Monthly family net worth report', frequency: 'monthly', params: {}, evaluate: (f) => f.family ? hit('Family net worth report', `Members who share their net worth total ${inr(f.family.total)}${f.family.hidden ? ` (${f.family.hidden} member(s) not sharing)` : ''}.`) : miss('No shared family data.') },
}

function hit(title, body) { return { fired: true, title, body } }
function miss(reason) { return { fired: false, reason } }
const days = (a, b) => Math.round((new Date(toISO(new Date(b))) - new Date(a)) / 86400000)
function addDays(iso, n) { const d = new Date(iso); d.setDate(d.getDate() + n); return toISO(d) }
function sipsDue(data, now, within) {
  const out = []
  const t = toISO(new Date(now))
  for (const s of data.sips || []) {
    if (s.status !== 'active') continue
    const f = (data.funds || []).find((x) => x.id === s.fundId)
    const day = Number(s.debitDay) || 1
    const d = new Date(now); d.setDate(1)
    for (const off of [0, 1]) {
      const m = new Date(d.getFullYear(), d.getMonth() + off, Math.min(day, 28))
      const iso = toISO(m)
      if (iso >= t && days(t, iso) <= within) out.push({ name: f?.name ?? 'SIP', amount: s.amount, date: iso })
    }
  }
  return out
}

export function defaultParams(templateId) {
  return Object.fromEntries(Object.entries(TEMPLATES[templateId].params).map(([k, v]) => [k, v.default]))
}

export function newRule(templateId, now = new Date()) {
  const t = TEMPLATES[templateId]
  return { id: `au_${Math.random().toString(36).slice(2, 10)}`, templateId, name: t.label, enabled: true, params: defaultParams(templateId), frequency: t.frequency, startDate: toISO(now), endDate: '', channels: { inApp: true, email: false, sms: false, push: false }, lastRunAt: null, nextRunAt: toISO(now), createdAt: new Date(now).toISOString() }
}

/** The next time a rule should run after `from`, by frequency. */
export function nextRunAfter(rule, from = new Date()) {
  const d = toISO(from)
  return rule.frequency === 'daily' ? addDays(d, 1) : rule.frequency === 'weekly' ? addDays(d, 7) : addMonths(d, 1)
}

export function isDue(rule, now = new Date()) {
  const t = toISO(now)
  if (!rule.enabled) return false
  if (rule.startDate && t < rule.startDate) return false
  if (rule.endDate && t > rule.endDate) return false
  return !rule.nextRunAt || rule.nextRunAt <= t
}

/** Run every due rule. Returns run records + updated rules. Pure: the caller stores results and delivers channels. */
export function runDueRules(rules, facts, data, now = new Date()) {
  const runs = []
  const updated = []
  for (const rule of rules) {
    if (!isDue(rule, now)) { updated.push(rule); continue }
    const tpl = TEMPLATES[rule.templateId]
    const at = new Date(now).toISOString()
    let run
    try {
      if (!tpl) throw new Error('Unknown template')
      const r = tpl.evaluate(facts, { ...defaultParams(rule.templateId), ...rule.params }, data, now)
      run = { id: `ar_${Math.random().toString(36).slice(2, 10)}`, ruleId: rule.id, ruleName: rule.name, at, status: 'success', fired: r.fired, title: r.fired ? r.title : null, body: r.fired ? r.body : r.reason, channels: Object.keys(rule.channels).filter((c) => rule.channels[c]) }
    } catch (e) {
      run = { id: `ar_${Math.random().toString(36).slice(2, 10)}`, ruleId: rule.id, ruleName: rule.name, at, status: 'failed', fired: false, title: null, body: e instanceof Error ? e.message : 'Failed', channels: [] }
    }
    runs.push(run)
    updated.push({ ...rule, lastRunAt: at, nextRunAt: nextRunAfter(rule, now) })
  }
  return { runs, rules: updated }
}
