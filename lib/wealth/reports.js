// Reports: the same figures as the app, laid out as plain tables for Excel and for printing to PDF.
// A report is { key, title, note, sheets: [{ name, columns: [...], rows: [[...], ...] }] }. Nothing here reads the screen, so it can be tested.
import { buildTransactions } from './transactions.js'
import { budgetRows } from './budgetRows.js'
import { fundMetrics, computeNetWorth, toISO } from './calc.js'
import { assetValue } from './holdings.js'
import { ASSET_LABELS, LIABILITY_LABELS } from './labels.js'

const n = (v) => Number(v) || 0
const r2 = (v) => Math.round(n(v) * 100) / 100
const accountName = (a) => (a ? (a.type === 'cash' ? 'Cash' : a.nickname || a.bankName || 'Account') : '')

export const REPORTS = [
  { key: 'networth', title: 'Net worth', description: 'Assets, liabilities and your net worth now, with the saved history.', usesPeriod: false },
  { key: 'transactions', title: 'Transactions', description: 'Income, expenses and transfers in the period you choose.', usesPeriod: true },
  { key: 'budget', title: 'Budget', description: 'Each category against its limit for the month of the end date.', usesPeriod: true },
  { key: 'investments', title: 'Investments', description: 'Mutual funds with returns, SIPs, and your other holdings.', usesPeriod: false },
  { key: 'ledger', title: 'Account ledger', description: 'Every balance change in each bank and cash account, with the balance after it.', usesPeriod: true },
  { key: 'accounts', title: 'Accounts, cards and insurance', description: 'Bank balances, card dues and policy cover.', usesPeriod: false },
  { key: 'all', title: 'Everything', description: 'All of the above in one workbook.', usesPeriod: true },
]

export function buildReport(key, data, { from = '', to = '', today = new Date() } = {}) {
  const def = REPORTS.find((r) => r.key === key)
  const t = toISO(today)
  const end = to || t
  const ym = end.slice(0, 7)
  const period = def?.usesPeriod ? `${from || 'the beginning'} to ${end}` : `as of ${t}`
  const make = (sheets) => ({ key, title: def?.title ?? key, note: period, sheets })

  const netWorthSheets = () => {
    const nw = computeNetWorth({ banks: data.bankAccounts, funds: data.funds, assets: data.assets, cards: data.cards, liabilities: data.liabilities })
    return [
      { name: 'Net worth', columns: ['Item', 'Amount'], rows: [['Total assets', r2(nw.assets)], ['Total liabilities', r2(nw.liabilities)], ['Net worth', r2(nw.netWorth)]] },
      { name: 'Assets', columns: ['Category', 'Value'], rows: Object.entries(nw.assetBreakdown).filter(([, v]) => n(v) !== 0).map(([k, v]) => [ASSET_LABELS[k] ?? k, r2(v)]) },
      { name: 'Liabilities', columns: ['Category', 'Outstanding'], rows: Object.entries(nw.liabilityBreakdown).filter(([, v]) => n(v) !== 0).map(([k, v]) => [LIABILITY_LABELS[k] ?? k, r2(v)]) },
      { name: 'History', columns: ['Date', 'Assets', 'Liabilities', 'Net worth'], rows: [...(data.snapshots || [])].sort((a, b) => a.date.localeCompare(b.date)).map((s) => [s.date, r2(s.assets), r2(s.liabilities), r2(s.netWorth)]) },
    ]
  }

  const transactionSheets = () => {
    const accounts = new Map((data.bankAccounts || []).map((a) => [a.id, a]))
    const list = buildTransactions({ expenses: data.expenses, bankTxns: data.bankTxns, transfers: data.transfers, bankAccounts: data.bankAccounts, cards: data.cards })
      .filter((x) => (!from || x.date >= from) && x.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date))
    const rows = list.map((x) => [x.date, x.kind === 'expense' ? 'Expense' : x.kind === 'income' ? 'Income' : 'Transfer', x.category, x.title, x.sub, x.kind === 'income' ? r2(x.amount) : x.kind === 'expense' ? -r2(x.amount) : r2(x.amount), accountName(accounts.get(x.raw?.accountId))])
    const sum = (k) => r2(list.filter((x) => x.kind === k).reduce((s, x) => s + x.amount, 0))
    return [
      { name: 'Summary', columns: ['Item', 'Amount'], rows: [['Income', sum('income')], ['Expenses', sum('expense')], ['Net', r2(sum('income') - sum('expense'))], ['Transfers (not counted)', sum('transfer')]] },
      { name: 'Transactions', columns: ['Date', 'Type', 'Category', 'Description', 'Details', 'Amount', 'Account'], rows },
    ]
  }

  const budgetSheets = () => {
    const budget = (data.budgets || []).find((b) => b.id === ym)
    if (!budget) return [{ name: 'Budget', columns: ['Note'], rows: [[`No budget was set for ${ym}.`]] }]
    const prev = (data.budgets || []).find((b) => b.id === new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 2, 1).toISOString().slice(0, 7))
    const { rows, total } = budgetRows({ budget, prevBudget: prev, expenses: data.expenses, ym, today })
    const out = [{ name: 'Budget', columns: ['Category', 'Limit', 'Spent', 'Left'], rows: [...rows.filter((r) => n(r.limit) > 0 || n(r.spent) > 0).map((r) => [r.category, r2(r.limit), r2(r.spent), r2(n(r.limit) - n(r.spent))]), ['All categories', r2(total.limit), r2(total.spent), r2(n(total.limit) - n(total.spent))]] }]
    const plans = (data.meta || []).find((m) => m.key === 'incomeBudgets')?.value || {}
    const planKey = Object.keys(plans).filter((k) => k <= ym).sort().pop()
    if (planKey) {
      const got = {}
      for (const x of data.bankTxns || []) if (x.type === 'income' && String(x.date).slice(0, 7) === ym) got[x.category || 'Other'] = (got[x.category || 'Other'] || 0) + n(x.amount)
      const plan = plans[planKey]
      out.push({ name: 'Income budget', columns: ['Category', 'Expected', 'Received'], rows: [...Object.entries(plan.categories || {}).map(([c, v]) => [c, r2(v), r2(got[c] || 0)]), ['All income', r2(plan.total), r2(Object.values(got).reduce((s, v) => s + v, 0))]] })
    }
    return out
  }

  const investmentSheets = () => [
    { name: 'Mutual funds', columns: ['Fund', 'Folio', 'Units', 'NAV', 'Invested', 'Value', 'Gain / loss', 'Return %', 'XIRR %'], rows: (data.funds || []).map((f) => { const m = fundMetrics(f, data.fundTxns || [], today); return [f.name, f.folio || '', r2(f.units), r2(f.currentNav), r2(m.invested), r2(m.value), r2(m.absReturn), r2(m.absReturnPct), m.xirrPct == null ? '' : r2(m.xirrPct)] }) },
    { name: 'SIPs', columns: ['Fund', 'Amount', 'Frequency', 'Debit day', 'Status'], rows: (data.sips || []).map((s) => [(data.funds || []).find((f) => f.id === s.fundId)?.name ?? '', r2(s.amount), s.frequency || '', s.debitDay ?? '', s.status || '']) },
    { name: 'Other holdings', columns: ['Name', 'Type', 'Value'], rows: (data.assets || []).map((a) => [a.name, ASSET_LABELS[a.category] ?? a.category, r2(assetValue(a))]) },
  ]

  const accountSheets = () => [
    { name: 'Bank accounts', columns: ['Account', 'Bank', 'Type', 'Balance'], rows: (data.bankAccounts || []).map((a) => [accountName(a), a.type === 'cash' ? '' : a.bankName || '', a.type, r2(a.currentBalance)]) },
    { name: 'Credit cards', columns: ['Card', 'Limit', 'Outstanding'], rows: (data.cards || []).map((c) => [`${c.bank} ${c.cardName}`, r2(c.limit), r2(c.outstanding)]) },
    { name: 'Insurance', columns: ['Policy', 'Company', 'Type', 'Cover', 'Premium', 'Frequency'], rows: (data.policies || []).map((p) => [p.policyName, p.company, p.type, r2(p.sumAssured), r2(p.premium), p.frequency || '']) },
    { name: 'Loans', columns: ['Loan', 'Type', 'Outstanding', 'EMI'], rows: (data.liabilities || []).map((l) => [l.name, LIABILITY_LABELS[l.category] ?? l.category, r2(l.outstanding), r2(l.emi)]) },
  ]

  const ledgerSheets = () => {
    const rows = []
    for (const a of data.bankAccounts || []) {
      const hist = (data.balanceHistory || []).filter((h) => h.accountId === a.id).sort((x, y) => x.date.localeCompare(y.date) || String(x.id).localeCompare(String(y.id)))
      hist.forEach((h, i) => {
        if ((from && h.date < from) || h.date > end) return
        const change = i === 0 ? null : r2(n(h.balance) - n(hist[i - 1].balance))
        rows.push([h.date, accountName(a), h.note || (change == null ? 'Opening balance' : 'Balance update'), change != null && change < 0 ? -change : '', change != null && change > 0 ? change : '', r2(h.balance)])
      })
    }
    rows.sort((x, y) => String(x[0]).localeCompare(String(y[0])) || String(x[1]).localeCompare(String(y[1])))
    return [{ name: 'Ledger', columns: ['Date', 'Account', 'Description', 'Money out', 'Money in', 'Balance'], rows }]
  }

  switch (key) {
    case 'ledger': return make(ledgerSheets())
    case 'networth': return make(netWorthSheets())
    case 'transactions': return make(transactionSheets())
    case 'budget': return make(budgetSheets())
    case 'investments': return make(investmentSheets())
    case 'accounts': return make(accountSheets())
    case 'all': return make([...netWorthSheets(), ...transactionSheets().map((s) => (s.name === 'Summary' ? { ...s, name: 'Cash flow' } : s)), ...budgetSheets(), ...investmentSheets(), ...accountSheets()])
    default: return make([])
  }
}

/** Excel does not allow these characters in a sheet name, nor more than 31 of them, and two sheets cannot share a name. */
export function sheetNames(sheets) {
  const used = new Set()
  return sheets.map((s) => {
    let base = String(s.name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet'
    let name = base, i = 2
    while (used.has(name.toLowerCase())) name = `${base.slice(0, 28)} ${i++}`
    used.add(name.toLowerCase())
    return name
  })
}
