// "Why did my net worth change?": splits the change between two snapshots into causes.
// Everything is derived from recorded balances and transactions, so the causes always add up to the total change.
import { round2, toISO, addMonths } from './calc.js'

const LABELS = { stocks: 'Stocks', epf: 'EPF', ppf: 'PPF', nps: 'NPS', fd: 'Fixed deposits', gold: 'Gold', realEstate: 'Real estate', other: 'Other assets' }
const LOAN_KEYS = (b) => Object.keys(b).filter((k) => k !== 'creditCards')

export function rangeBase(snapshots, range, today = new Date()) {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  if (!sorted.length) return null
  if (range === 'All') return sorted[0]
  const months = { Month: 1, '3 months': 3, Year: 12 }[range] ?? 1
  const target = addMonths(toISO(today), -months)
  let base = null
  for (const s of sorted) if (s.date <= target) base = s
  return base || sorted[0]
}

export function netWorthAttribution({ base, current, fundTxns = [] }) {
  if (!base) return null
  const diff = round2(current.netWorth - base.netWorth)
  const causes = []
  const add = (key, label, amount, note) => { if (Math.abs(amount) >= 1) causes.push({ key, label, amount: round2(amount), note }) }

  // mutual funds: new money vs market movement
  const mfNow = current.assetBreakdown.mutualFunds || 0
  const mfBase = base.assetBreakdown?.mutualFunds || 0
  const flow = fundTxns.filter((t) => t.date > base.date).reduce((s, t) => s + (t.type === 'redeem' ? -Math.abs(t.amount) : Math.abs(t.amount)), 0)
  add('mf-invest', 'Monthly investing', flow, 'SIPs and lumpsums added to mutual funds')
  add('mf-market', 'Mutual fund growth', mfNow - mfBase - flow, 'Change in NAV on your holdings')

  // bank & cash
  add('bank', 'Cash and bank balances', (current.assetBreakdown.bank || 0) - (base.assetBreakdown?.bank || 0), 'Income saved, minus spending and money moved into investments')

  // other assets: only a value update can be shown
  for (const k of Object.keys(LABELS)) add(`asset-${k}`, `${LABELS[k]}: value change`, (current.assetBreakdown[k] || 0) - (base.assetBreakdown?.[k] || 0), 'Updated value or new holding')

  // liabilities
  const bl = base.liabilityBreakdown || {}
  const cl = current.liabilityBreakdown
  let repaid = 0
  let borrowed = 0
  for (const k of new Set([...LOAN_KEYS(bl), ...LOAN_KEYS(cl)])) {
    const d = (cl[k] || 0) - (bl[k] || 0)
    if (d < 0) repaid += -d
    else borrowed += d
  }
  add('loan-repaid', 'Loan principal repaid', repaid, 'Outstanding loan balances went down')
  add('loan-new', 'New borrowing', -borrowed, 'Outstanding loan balances went up')
  add('card', 'Credit card dues', -((cl.creditCards || 0) - (bl.creditCards || 0)), 'Change in card outstanding')

  const explained = round2(causes.reduce((s, c) => s + c.amount, 0))
  return { diff, from: base.netWorth, to: current.netWorth, baseDate: base.date, causes: causes.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)), explained, unexplained: round2(diff - explained) }
}
