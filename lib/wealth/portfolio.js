import { portfolioSummary } from './calc.js'
import { assetGain, assetInvested, assetValue, epfShares, etfDetails, fdDetails, goldValue, rdDetails } from './holdings.js'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const pct1 = (n) => Math.round(n * 10) / 10

/** The classes the Investments page groups holdings into. */
export const GROUPS = [
  { key: 'mutualFunds', label: 'Mutual funds', cats: [] },
  { key: 'market', label: 'Stocks and ETFs', cats: ['stocks', 'etf'] },
  { key: 'fd', label: 'Fixed deposits', cats: ['fd'] },
  { key: 'rd', label: 'Recurring deposits', cats: ['rd'] },
  { key: 'epf', label: 'EPF', cats: ['epf'] },
  { key: 'ppf', label: 'PPF', cats: ['ppf'] },
  { key: 'nps', label: 'NPS', cats: ['nps'] },
  { key: 'gold', label: 'Gold', cats: ['gold'] },
  { key: 'esop', label: 'ESOPs and RSUs', cats: ['esop'] },
]
/** Things you own that are not investments. They count in net worth but not in the investment returns, and each has its own tab. */
export const PROPERTY_GROUPS = [
  { key: 'realEstate', label: 'Real estate', cats: ['realEstate'] },
  { key: 'vehicle', label: 'Vehicle', cats: ['vehicle'] },
  { key: 'other', label: 'Other assets', cats: ['other'] },
]
export const INVESTMENT_CATS = GROUPS.flatMap((g) => g.cats)

/**
 * The whole portfolio: mutual funds plus every investment asset, worth now, what was put in (where it is known) and the gain.
 * `invested` and `gain` count only holdings whose cost is known, so an asset with no cost never shows as a gain of its whole value.
 */
export function portfolioOverview({ funds = [], fundTxns = [], sips = [], assets = [], today = new Date() }) {
  const mf = funds.length ? portfolioSummary(funds, fundTxns, sips, today) : { value: 0, invested: 0 }
  const rows = GROUPS.map((g) => {
    if (g.key === 'mutualFunds') return { key: g.key, label: g.label, count: funds.length, value: Math.round(num(mf.value)), invested: Math.round(num(mf.invested)), known: Math.round(num(mf.value)) }
    const mine = assets.filter((a) => g.cats.includes(a.category))
    let value = 0, invested = 0, known = 0
    for (const a of mine) {
      const v = assetValue(a, today); value += v
      const ag = assetGain(a, today)
      if (ag) { invested += ag.invested; known += ag.value }
    }
    return { key: g.key, label: g.label, count: mine.length, value: Math.round(value), invested: Math.round(invested), known: Math.round(known) }
  })
  const total = rows.reduce((s, r) => s + r.value, 0)
  const invested = rows.reduce((s, r) => s + r.invested, 0)
  const known = rows.reduce((s, r) => s + r.known, 0)
  return {
    total, invested, gain: known - invested, gainPct: invested > 0 ? pct1(((known - invested) / invested) * 100) : null,
    rows: rows.map((r) => ({ ...r, share: total > 0 ? pct1((r.value / total) * 100) : 0, gain: r.invested > 0 ? r.known - r.invested : null, gainPct: r.invested > 0 ? pct1(((r.known - r.invested) / r.invested) * 100) : null })),
  }
}

/** Fixed or recurring deposits split into running and matured, running ones in the order they mature. */
export function depositGroups(assets = [], kind, today = new Date()) {
  const mine = assets.filter((a) => a.category === kind).map((a) => {
    if (kind === 'fd') { const d = fdDetails(a, today); return { a, invested: d.principal, value: d.value, interest: d.interest, maturityValue: d.maturityValue, matured: d.matured, daysLeft: d.daysLeft } }
    const d = rdDetails(a, today)
    return { a, invested: d.invested, value: d.value, interest: d.interest, maturityValue: d.maturityValue, matured: d.matured, daysLeft: null, paid: d.paid, tenure: d.tenure }
  })
  const key = (x) => x.a.maturityDate || '9999'
  const running = mine.filter((x) => !x.matured).sort((p, q) => key(p).localeCompare(key(q)))
  const matured = mine.filter((x) => x.matured)
  const sum = (k) => mine.reduce((s, x) => s + num(x[k]), 0)
  const avgRate = mine.length && sum('invested') > 0 ? Math.round((mine.reduce((s, x) => s + num(x.a.ratePct) * num(x.invested), 0) / sum('invested')) * 100) / 100 : null
  return { running, matured, invested: Math.round(sum('invested')), value: Math.round(sum('value')), interest: Math.round(sum('interest')), avgRate }
}

/** Every detail worth showing for one holding, as label and value pairs. Missing details are left out, not shown as zero. */
export function assetFacts(a, today = new Date()) {
  const out = []
  const add = (label, value) => { if (value !== null && value !== undefined && value !== '') out.push({ label, value }) }
  const rate = a.ratePct ? `${num(a.ratePct)}% a year` : null
  if (a.category === 'fd') {
    const d = fdDetails(a, today)
    add('Amount deposited', { money: d.principal }); add('Interest rate', rate); add('Opened on', a.startDate ? { date: a.startDate } : null); add('Matures on', a.maturityDate ? { date: a.maturityDate } : null)
    add('Interest earned so far', { money: d.interest }); add('Value today', { money: d.value }); add('Value at maturity', d.maturityValue != null ? { money: d.maturityValue } : null)
    add('Time left', d.daysLeft == null ? null : d.matured ? 'Matured' : `${d.daysLeft} days`)
  } else if (a.category === 'rd') {
    const d = rdDetails(a, today)
    add('Monthly instalment', { money: num(a.monthlyInstalment) }); add('Interest rate', rate); add('Started on', a.startDate ? { date: a.startDate } : null)
    add('Instalments paid', d.tenure > 0 ? `${d.paid} of ${d.tenure}` : String(d.paid)); add('Put in so far', { money: d.invested }); add('Interest earned so far', { money: d.interest })
    add('Value today', { money: d.value }); add('Value at maturity', d.maturityValue != null ? { money: d.maturityValue } : null); add('Status', d.matured ? 'Matured' : null)
  } else if (a.category === 'epf') {
    const s = epfShares(a)
    add('Your contribution', { money: s.employee }); add('Employer contribution', { money: s.employer }); add('Pension (EPS)', { money: s.eps }); add('Total balance', { money: s.employee + s.employer + s.eps })
  } else if (a.category === 'etf') {
    const d = etfDetails(a)
    add('Kind', a.etfKind); add('Units', d.units || null); add('Average price', d.avg ? { money: d.avg } : null); add('Latest price', d.nav ? { money: d.nav } : null)
    add('Invested', d.invested ? { money: d.invested } : null); add('Value today', { money: d.value }); add('Gain', d.gain != null ? { money: d.gain } : null)
  } else if (a.category === 'gold') {
    add('Weight', a.grams ? `${num(a.grams)} g` : null); add('Purity', a.karat ? `${num(a.karat)} karat` : null); add('24 karat rate', a.rate24 ? { money: num(a.rate24) } : null)
    add('Paid', assetInvested(a) ? { money: assetInvested(a) } : null); add('Value today', { money: goldValue(a) ?? assetValue(a, today) })
  } else {
    if (a.category === 'vehicle') add('Vehicle type', a.vehicleType)
    add('Value', { money: assetValue(a, today) }); add('Put in', assetInvested(a) ? { money: assetInvested(a) } : null)
    const g = assetGain(a, today); if (g) add('Gain', { money: g.gain })
  }
  add('Updated', a.updated ? { date: a.updated } : null); add('Notes', a.notes || null)
  return out
}
