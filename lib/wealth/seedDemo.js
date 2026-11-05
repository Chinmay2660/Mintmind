// Demo Mode dataset. All names, numbers and identifiers are fictitious.
// Totals (the spec's headline numbers):
//   Assets      ₹1,05,45,000 = MF 18.5L + stocks 12L + EPF 8.5L + PPF 5L + FD 10L + savings 4.45L + real estate 45L + gold 2L
//   Liabilities ₹20,00,000   = home loan 17.55L + car loan 2L + credit-card dues 0.45L
//   Net worth   ₹85,45,000
import { clearAll, uid } from './db'
import { addMonths, computeNetWorth, toISO, daysInMonth, parseDate } from './calc'

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DEMO_SEED_VERSION = 5
export const DEMO_VAULT_PASSWORD = 'Demo@1234'

export async function seedDemo(db, today = new Date()) {
  await clearAll(db)
  const rand = rng(20240607)
  const T = toISO(today)
  const ago = (m) => addMonths(T, -m)

  // ---------- Bank accounts (savings total 4,45,000) ----------
  const banks = [
    { id: 'bank_hdfc', bankName: 'HDFC Bank', holderName: 'Arjun Mehta', nickname: 'Primary Savings', accountNumber: '50100234567891', ifsc: 'HDFC0001234', type: 'savings', currentBalance: 195000, mab: 25000, notes: 'Salary account' },
    { id: 'bank_sbi', bankName: 'State Bank of India', holderName: 'Arjun Mehta', nickname: 'SBI Savings', accountNumber: '32145678901', ifsc: 'SBIN0004567', type: 'savings', currentBalance: 135000, mab: 10000, notes: '' },
    { id: 'bank_icici', bankName: 'ICICI Bank', holderName: 'Priya Mehta', nickname: 'Joint Household', accountNumber: '012301567890', ifsc: 'ICIC0000123', type: 'joint', currentBalance: 100000, mab: 10000, notes: 'Household expenses (joint)' },
    { id: 'bank_cash', bankName: 'Cash', holderName: 'Arjun Mehta', nickname: 'Cash in hand', accountNumber: '', ifsc: '', type: 'cash', currentBalance: 15000, notes: 'Wallet and home cash' },
  ].map((b) => ({ ...b, lastUpdated: T }))
  await db.bankAccounts.bulkAdd(banks)
  await db.debitCards.bulkAdd([
    { id: 'dc_hdfc', bank: 'HDFC Bank', cardName: 'Millennia Debit', network: 'Visa', cardNumber: '4570123456789010', holder: 'Arjun Mehta', accountId: 'bank_hdfc' },
    { id: 'dc_icici', bank: 'ICICI Bank', cardName: 'Coral Debit', network: 'Mastercard', cardNumber: '5243987654321098', holder: 'Priya Mehta', accountId: 'bank_icici' },
  ])
  const bh = []
  for (const b of banks) {
    for (let m = 11; m >= 0; m--) {
      const f = m === 0 ? 1 : 0.8 + rand() * 0.35
      bh.push({ id: uid('bh'), accountId: b.id, date: ago(m), balance: Math.round((b.currentBalance * f) / 100) * 100, note: m === 0 ? 'Current' : '' })
    }
  }
  await db.balanceHistory.bulkAdd(bh)
  const incomeTx = []
  for (let m = 6; m >= 0; m--) {
    const d = addMonths(T.slice(0, 8) + '01', -m)
    if (d > T) continue
    incomeTx.push({ id: uid('bt'), accountId: 'bank_hdfc', date: d, type: 'income', category: 'Salary', amount: 185000, description: 'Salary credit - Acme Technologies' })
    incomeTx.push({ id: uid('bt'), accountId: 'bank_hdfc', date: d.slice(0, 8) + '05', type: 'transfer', amount: 40000, description: 'Transfer to Joint Household (ICICI)' })
  }
  await db.bankTxns.bulkAdd(incomeTx.filter((t) => t.date <= T))
  await db.transfers.bulkAdd([
    { id: uid('tr'), date: ago(1), amount: 5000, fromType: 'account', fromId: 'bank_hdfc', toType: 'account', toId: 'bank_cash', note: 'ATM withdrawal' },
    { id: uid('tr'), date: ago(1), amount: 20000, fromType: 'account', fromId: 'bank_hdfc', toType: 'account', toId: 'bank_icici', note: 'Household top-up' },
  ])

  // ---------- Mutual funds (value total 18,50,000) ----------
  const funds = [
    { id: 'mf_ppfas', name: 'Parag Parikh Flexi Cap Fund - Direct Growth', fundHouse: 'PPFAS Mutual Fund', category: 'Equity - Flexi Cap', folio: '12345678/91', investmentType: 'SIP + Lumpsum', units: 7000, currentNav: 80, prevNav: 79.4, lump: [40, 100000], sip: [10000, 30], sipId: 'sip_ppfas' },
    { id: 'mf_hdfcidx', name: 'HDFC Index Fund - Nifty 50 Plan - Direct', fundHouse: 'HDFC Mutual Fund', category: 'Equity - Index', folio: '88776655/12', investmentType: 'SIP + Lumpsum', units: 2000, currentNav: 195, prevNav: 194.1, lump: [30, 60000], sip: [10000, 24], sipId: 'sip_hdfc' },
    { id: 'mf_axissc', name: 'Axis Small Cap Fund - Direct Growth', fundHouse: 'Axis Mutual Fund', category: 'Equity - Small Cap', folio: '9100234567', investmentType: 'SIP + Lumpsum', units: 4000, currentNav: 90, prevNav: 90.6, lump: [36, 50000], sip: [5000, 40], sipId: 'sip_axis' },
    { id: 'mf_miraeelss', name: 'Mirae Asset ELSS Tax Saver Fund - Direct', fundHouse: 'Mirae Asset Mutual Fund', category: 'Equity - ELSS', folio: '7788990011', investmentType: 'SIP', units: 5000, currentNav: 52, prevNav: 51.8, lump: null, sip: [5000, 40], sipEndedMonthsAgo: 13, sipId: 'sip_mirae' },
    { id: 'mf_icicibond', name: 'ICICI Prudential Corporate Bond Fund - Direct', fundHouse: 'ICICI Prudential Mutual Fund', category: 'Debt - Corporate Bond', folio: '20456789', investmentType: 'Lumpsum', units: 8000, currentNav: 35, prevNav: 34.97, lump: [24, 200000], sip: null },
  ]
  const fundRows = []
  const fundTxns = []
  const sips = []
  for (const f of funds) {
    let invested = 0
    let firstDate = T
    if (f.lump) {
      const d = ago(f.lump[0])
      fundTxns.push({ id: uid('ft'), fundId: f.id, date: d, type: 'lumpsum', amount: f.lump[1], nav: 0, units: 0 })
      invested += f.lump[1]
      firstDate = d
    }
    let completed = 0
    if (f.sip) {
      const endAgo = f.sipEndedMonthsAgo ?? 1
      const k = f.sip[1]
      for (let i = 0; i < k; i++) {
        const d = addMonths(addMonths(T.slice(0, 8) + '05', -(endAgo + k - 1 - i)), 0)
        fundTxns.push({ id: uid('ft'), fundId: f.id, date: d, type: 'sip', amount: f.sip[0], nav: 0, units: 0 })
        invested += f.sip[0]
        completed++
        if (d < firstDate) firstDate = d
      }
      const ended = f.sipEndedMonthsAgo != null
      sips.push({
        id: f.sipId, fundId: f.id, amount: f.sip[0], frequency: 'monthly', debitDay: 5,
        startDate: addMonths(T.slice(0, 8) + '05', -(endAgo + k - 1)),
        endDate: ended ? addMonths(T.slice(0, 8) + '05', -endAgo) : null,
        accountId: ended ? null : 'bank_hdfc', instalmentsTotal: ended ? k : 120, instalmentsCompleted: completed, status: ended ? 'completed' : 'active',
      })
    }
    // Back-fill NAV/units on txns pro-rata so avg NAV is coherent with total units
    const avgNav = invested / f.units
    for (const t of fundTxns.filter((x) => x.fundId === f.id)) {
      t.nav = Math.round(avgNav * 100) / 100
      t.units = Math.round((t.amount / avgNav) * 1000) / 1000
    }
    fundRows.push({
      id: f.id, name: f.name, fundHouse: f.fundHouse, category: f.category, folio: f.folio, investmentType: f.investmentType,
      investmentDate: firstDate, units: f.units, purchaseNav: Math.round(avgNav * 100) / 100, currentNav: f.currentNav, prevNav: f.prevNav,
      invested, currentValue: Math.round(f.units * f.currentNav), navDate: T, navSource: 'manual', notes: 'Demo data',
    })
  }
  await db.funds.bulkAdd(fundRows)
  await db.fundTxns.bulkAdd(fundTxns)
  await db.sips.bulkAdd(sips)

  // ---------- Other assets & loans ----------
  await db.assets.bulkAdd([
    { id: 'as_stocks', category: 'stocks', name: 'Equity portfolio (Zerodha)', value: 1200000, updated: T, notes: 'Direct equity holdings' },
    { id: 'as_epf', category: 'epf', name: 'Employees Provident Fund', value: 850000, updated: T, notes: '' },
    { id: 'as_ppf', category: 'ppf', name: 'Public Provident Fund (SBI)', value: 500000, updated: T, notes: '' },
    { id: 'as_fd', category: 'fd', name: 'Fixed Deposits (HDFC & SBI)', value: 1000000, updated: T, notes: 'Two FDs, laddered' },
    { id: 'as_re', category: 'realEstate', name: 'Flat - Powai, Mumbai (2 BHK)', value: 4500000, updated: T, notes: 'Estimated market value' },
    { id: 'as_gold', category: 'gold', name: 'Gold jewellery & coins', value: 200000, updated: T, notes: '' },
  ])
  await db.liabilities.bulkAdd([
    { id: 'li_home', category: 'homeLoan', name: 'Home loan - HDFC', outstanding: 1755000, emi: 38500, rate: 8.65, updated: T, notes: '' },
    { id: 'li_car', category: 'carLoan', name: 'Car loan - SBI', outstanding: 200000, emi: 9800, rate: 9.1, updated: T, notes: '' },
  ])

  // ---------- Goals (linked to accounts / funds / assets; no extra money, no double counting) ----------
  await db.goals.bulkAdd([
    { id: 'goal_emergency', name: 'Emergency fund', target: 360000, targetDate: addMonths(T, 12), notes: '6 months of expenses', links: [{ type: 'bank', id: 'bank_sbi', pct: 100 }, { type: 'bank', id: 'bank_icici', pct: 100 }, { type: 'bank', id: 'bank_cash', pct: 100 }] },
    { id: 'goal_marriage', name: 'Marriage fund', target: 1500000, targetDate: addMonths(T, 30), notes: 'Sister\u2019s wedding', links: [{ type: 'asset', id: 'as_fd', pct: 50 }, { type: 'fund', id: 'mf_icicibond', pct: 100 }] },
    { id: 'goal_edu', name: 'Child education', target: 2500000, targetDate: addMonths(T, 96), notes: '', links: [{ type: 'fund', id: 'mf_ppfas', pct: 100 }, { type: 'fund', id: 'mf_axissc', pct: 50 }] },
  ])

  // ---------- Credit cards ----------
  const cards = [
    { id: 'cc_hdfc', bank: 'HDFC Bank', cardName: 'Regalia Gold', network: 'Visa', cardNumber: '4096123456789012', holder: 'Arjun Mehta', limit: 200000, outstanding: 45000, available: 155000, statementDay: 12, dueDay: 2, billingDay: 12 },
    { id: 'cc_icici', bank: 'ICICI Bank', cardName: 'Amazon Pay', network: 'Visa', cardNumber: '4315987654321098', holder: 'Arjun Mehta', limit: 100000, outstanding: 0, available: 100000, statementDay: 20, dueDay: 8, billingDay: 20 },
    { id: 'cc_sbi', bank: 'SBI Card', cardName: 'SimplyCLICK', network: 'Mastercard', cardNumber: '5412345678901234', holder: 'Priya Mehta', limit: 150000, outstanding: 0, available: 150000, statementDay: 5, dueDay: 25, billingDay: 5 },
  ]
  await db.cards.bulkAdd(cards)
  const stm = []
  const pay = []
  for (let m = 5; m >= 1; m--) {
    const d = addMonths(T.slice(0, 8) + '12', -m)
    const amt = Math.round((28000 + rand() * 22000) / 100) * 100
    stm.push({ id: uid('st'), cardId: 'cc_hdfc', statementDate: d, dueDate: addMonths(T.slice(0, 8) + '02', -m + 1), amount: amt, minDue: Math.round(amt * 0.05), status: 'paid' })
    pay.push({ id: uid('pay'), cardId: 'cc_hdfc', date: addMonths(T.slice(0, 8) + '01', -m + 1), amount: amt, accountId: 'bank_hdfc', note: 'Full statement payment' })
  }
  await db.cardStatements.bulkAdd(stm)
  await db.cardPayments.bulkAdd(pay)

  // ---------- Insurance ----------
  const policies = [
    { id: 'pol_health', accountId: 'bank_hdfc', type: 'health', company: 'Star Health Insurance', policyName: 'Family Health Optima', policyNumber: 'P/700012/01/2025/003456', holder: 'Arjun Mehta', nominee: 'Priya Mehta', sumAssured: 1000000, premium: 24500, frequency: 'yearly', startDate: ago(7), endDate: addMonths(ago(7), 12), nextPremium: addMonths(ago(7), 12), members: ['Arjun Mehta', 'Priya Mehta', 'Aarav Mehta'], notes: 'Family floater' },
    { id: 'pol_term', accountId: 'bank_hdfc', type: 'term', company: 'HDFC Life', policyName: 'Click 2 Protect Super', policyNumber: '20456781', holder: 'Arjun Mehta', nominee: 'Priya Mehta', sumAssured: 15000000, premium: 18200, frequency: 'yearly', startDate: ago(30), endDate: addMonths(ago(30), 12 * 30), nextPremium: addMonths(T.slice(0, 8) + '18', 1), members: ['Arjun Mehta'], notes: '30-year term' },
    { id: 'pol_motor', type: 'motor', company: 'ICICI Lombard', policyName: 'Comprehensive Car Insurance', policyNumber: '3001/245678901/00/000', holder: 'Arjun Mehta', nominee: '', sumAssured: 650000, premium: 12400, frequency: 'yearly', startDate: ago(2), endDate: addMonths(ago(2), 12), nextPremium: addMonths(ago(2), 12), members: [], notes: 'Hyundai Creta' },
    { id: 'pol_home', type: 'home', company: 'Bajaj Allianz', policyName: 'Householder Package', policyNumber: 'OG-25-1101-4321-0098', holder: 'Arjun Mehta', nominee: '', sumAssured: 3500000, premium: 4200, frequency: 'yearly', startDate: ago(5), endDate: addMonths(ago(5), 12), nextPremium: addMonths(ago(5), 12), members: [], notes: '' },
    { id: 'pol_life', type: 'life', company: 'LIC of India', policyName: 'Jeevan Anand', policyNumber: '734561289', holder: 'Priya Mehta', nominee: 'Arjun Mehta', sumAssured: 2500000, premium: 3900, frequency: 'monthly', startDate: ago(60), endDate: addMonths(ago(60), 240), nextPremium: addMonths(T.slice(0, 8) + '10', T.slice(8) > '10' ? 1 : 0), members: ['Priya Mehta'], notes: '' },
  ]
  await db.policies.bulkAdd(policies)
  await db.premiums.bulkAdd(
    policies.flatMap((p) => {
      if (p.frequency === 'monthly') {
        return [3, 2, 1].map((m) => ({ id: uid('pr'), policyId: p.id, date: addMonths(p.nextPremium, -m - 1), amount: p.premium }))
      }
      return [1].map(() => ({ id: uid('pr'), policyId: p.id, date: p.startDate, amount: p.premium }))
    })
  )

  // ---------- Budget & expenses ----------
  const catBudget = { Food: 12000, Shopping: 8000, Travel: 6000, Entertainment: 4000, Groceries: 10000, Bills: 12000, Healthcare: 3000, Other: 5000 }
  const budgets = []
  for (let m = 6; m >= 0; m--) {
    const id = addMonths(T.slice(0, 8) + '01', -m).slice(0, 7)
    budgets.push({ id, total: 60000, categories: catBudget, rollover: false })
  }
  await db.budgets.bulkAdd(budgets)
  const weights = [['Food', 0.2, 250, 900], ['Groceries', 0.17, 400, 2200], ['Shopping', 0.12, 600, 3500], ['Travel', 0.1, 150, 2500], ['Entertainment', 0.07, 300, 1400], ['Bills', 0.12, 400, 3500], ['Healthcare', 0.05, 300, 1600], ['Other', 0.17, 100, 1500]]
  const modes = ['upi', 'upi', 'card', 'card', 'cash', 'debit', 'bank']
  const expenses = []
  const todayD = parseDate(T)
  for (let m = 6; m >= 0; m--) {
    const first = addMonths(T.slice(0, 8) + '01', -m)
    const [y, mo] = first.split('-').map(Number)
    const dim = daysInMonth(y, mo)
    const lastDay = m === 0 ? todayD.getDate() : dim
    const target = (m === 0 ? 0.9 : 0.85 + rand() * 0.2) * 60000 * (lastDay / dim)
    let total = 0
    let guard = 0
    while (total < target && guard++ < 200) {
      let r = rand()
      let cat = weights[weights.length - 1]
      for (const w of weights) {
        if ((r -= w[1]) <= 0) { cat = w; break }
      }
      const amount = Math.round(cat[2] + rand() * (cat[3] - cat[2]))
      const day = 1 + Math.floor(rand() * lastDay)
      const mode = modes[Math.floor(rand() * modes.length)]
      expenses.push({
        id: uid('ex'), date: `${first.slice(0, 8)}${String(day).padStart(2, '0')}`, amount, category: cat[0], mode,
        cardId: mode === 'card' ? 'cc_hdfc' : null, debitCardId: mode === 'debit' ? 'dc_hdfc' : null,
        accountId: mode === 'card' ? null : mode === 'cash' ? 'bank_cash' : mode === 'upi' ? (rand() < 0.7 ? 'bank_hdfc' : 'bank_icici') : 'bank_hdfc',
        note: { Food: 'Restaurant / takeaway', Groceries: 'Supermarket', Shopping: 'Online order', Travel: 'Cab / fuel', Entertainment: 'Movie / OTT', Bills: 'Utility bill', Healthcare: 'Pharmacy / clinic', Other: 'Miscellaneous' }[cat[0]],
      })
      total += amount
    }
  }
  await db.expenses.bulkAdd(expenses)

  // ---------- Family ----------
  await db.members.bulkAdd([
    { id: 'fm_self', name: 'Arjun Mehta', email: 'arjun.demo@example.com', relation: 'Self', role: 'admin', status: 'active', permissions: { netWorth: true, overview: true, bank: true, mutualFunds: true, insurance: true, documents: true, emergencyOnly: false }, summary: null, self: true },
    { id: 'fm_priya', name: 'Priya Mehta', email: 'priya.demo@example.com', relation: 'Spouse', role: 'member', status: 'active', permissions: { netWorth: true, overview: true, bank: false, mutualFunds: true, insurance: true, documents: false, emergencyOnly: false }, summary: { assets: 1450000, liabilities: 0, netWorth: 1450000, growthPct: 1.1, bank: 350000, mutualFunds: 600000, insuranceCover: 2500000, joint: [{ key: 'acct:012301567890', value: 100000 }] } },
    { id: 'fm_rajesh', name: 'Rajesh Mehta', email: 'rajesh.demo@example.com', relation: 'Father', role: 'emergency_contact', status: 'active', permissions: { netWorth: false, overview: false, bank: false, mutualFunds: false, insurance: true, documents: true, emergencyOnly: true }, summary: { assets: 2200000, liabilities: 0, netWorth: 2200000, growthPct: 0.6, bank: 400000, mutualFunds: 0, insuranceCover: 500000, joint: [] } },
    { id: 'fm_sunita', name: 'Sunita Mehta', email: 'sunita.demo@example.com', relation: 'Mother', role: 'member', status: 'pending', permissions: { netWorth: false, overview: true, bank: false, mutualFunds: false, insurance: true, documents: false, emergencyOnly: false }, summary: null },
  ])

  // ---------- Documents (sample metadata; no real files in demo) ----------
  await db.documents.bulkAdd([
    { id: 'doc_pan', name: 'PAN Card', category: 'Identity', fileName: 'pan-card.pdf', mimeType: 'application/pdf', size: 184320, source: 'demo', driveFileId: null, uploaded: ago(10), notes: 'Sample document' },
    { id: 'doc_aadhaar', name: 'Aadhaar (masked copy)', category: 'Identity', fileName: 'aadhaar.pdf', mimeType: 'application/pdf', size: 256000, source: 'demo', driveFileId: null, uploaded: ago(10), notes: 'Sample document' },
    { id: 'doc_stmt', name: 'HDFC Statement - Last 6 months', category: 'Bank', fileName: 'hdfc-statement.pdf', mimeType: 'application/pdf', size: 912000, source: 'demo', driveFileId: null, uploaded: ago(1), notes: 'Sample document' },
    { id: 'doc_cas', name: 'Mutual Fund CAS', category: 'Investment', fileName: 'cas.pdf', mimeType: 'application/pdf', size: 540000, source: 'demo', driveFileId: null, uploaded: ago(2), notes: 'Sample document' },
    { id: 'doc_health', name: 'Star Health Policy', category: 'Insurance', fileName: 'star-health-policy.pdf', mimeType: 'application/pdf', size: 700000, source: 'demo', driveFileId: null, uploaded: ago(7), notes: 'Sample document' },
    { id: 'doc_flat', name: 'Flat Sale Deed', category: 'Property', fileName: 'sale-deed.pdf', mimeType: 'application/pdf', size: 2300000, source: 'demo', driveFileId: null, uploaded: ago(30), notes: 'Sample document' },
  ])

  // ---------- Digital legacy ----------
  await db.legacy.add({
    id: 'legacy', enabled: true, inactivityDays: 90, graceDays: 14, reminderChannels: { email: true, push: true, sms: false },
    lastActiveAt: new Date().toISOString(), lastReminderAt: null, state: 'monitoring',
    contacts: [
      { id: 'lc_priya', name: 'Priya Mehta', email: 'priya.demo@example.com', mobile: '+91 90000 00001', relationship: 'Spouse', kind: 'primary_nominee', priority: 1, verified: true, accepted: true },
      { id: 'lc_rajesh', name: 'Rajesh Mehta', email: 'rajesh.demo@example.com', mobile: '+91 90000 00002', relationship: 'Father', kind: 'emergency_contact', priority: 2, verified: true, accepted: true },
      { id: 'lc_neha', name: 'Neha Kapoor', email: 'neha.demo@example.com', mobile: '+91 90000 00003', relationship: 'Sister', kind: 'secondary_nominee', priority: 3, verified: false, accepted: false },
    ],
    package: { notes: 'Where documents are kept, how to reach the CA, FD & insurance locations.', include: { netWorth: true, accounts: true, insurance: true, documents: true } },
    vaultAccess: { authorisedItemIds: [], grantedContactIds: [] },
    accessLog: [],
  })

  // ---------- Net worth snapshots (24 months; final point is live-computed) ----------
  const nw = computeNetWorth({ banks, funds: fundRows, assets: await db.assets.toArray(), cards, liabilities: await db.liabilities.toArray() })
  const snaps = []
  for (let i = 24; i >= 1; i--) {
    const noise = 1 + (rand() - 0.5) * 0.012
    const a = nw.assets / Math.pow(1.0125, i) * noise
    const l = nw.liabilities * (1 + 0.012 * i)
    const scale = a / nw.assets
    snaps.push({
      id: ago(i).slice(0, 7), date: ago(i), assets: Math.round(a), liabilities: Math.round(l), netWorth: Math.round(a - l),
      assetBreakdown: Object.fromEntries(Object.entries(nw.assetBreakdown).map(([k, v]) => [k, Math.round(v * scale)])),
      liabilityBreakdown: Object.fromEntries(Object.entries(nw.liabilityBreakdown).map(([k, v]) => [k, Math.round(v * (l / nw.liabilities))])),
    })
  }
  await db.snapshots.bulkAdd(snaps)

  await db.meta.bulkPut([
    { key: 'profile', value: { name: 'Arjun Mehta', email: 'arjun.demo@example.com', phone: '+91 98000 00000', city: 'Mumbai', monthlyIncome: 185000 } },
    { key: 'seeded', value: T },
    { key: 'seedVersion', value: DEMO_SEED_VERSION },
    { key: 'prefs', value: { currency: 'INR', dateFormat: 'DD MMM YYYY', hideBalances: false, notifications: { premiums: true, cardDues: true, sips: true, budget: true }, autoLockMinutes: 5 } },
  ])
  return nw
}
