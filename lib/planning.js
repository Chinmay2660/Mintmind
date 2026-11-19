// Plan-ahead maths (pure, tested). Everything is an assumption-driven what-if, never a prediction.
import { emi, retirementCorpus } from './calculators.js'

export const EVENT_TYPES = {
  lumpsum: { label: 'Lumpsum', title: 'Invest a lumpsum', unit: 'amount', min: 100000, max: 5000000, step: 50000, def: 1000000, note: 'Invested today and left to grow' },
  raise: { label: 'Raise', title: 'Get a raise', unit: 'extra per month', min: 5000, max: 100000, step: 5000, def: 25000, note: 'Extra income, assumed saved' },
  child: { label: 'Child', title: 'Have a child', unit: 'extra cost per month', min: 10000, max: 80000, step: 5000, def: 30000, note: 'For the next 20 years' },
  car: { label: 'Car', title: 'Buy a car', unit: 'car price', min: 300000, max: 3000000, step: 50000, def: 1100000, note: 'Paid upfront, running costs 0.7% a month' },
  home: { label: 'Home', title: 'Buy a home', unit: 'home price', min: 2000000, max: 20000000, step: 500000, def: 7500000, note: '20% down, rest on a 20-year EMI' },
  marriage: { label: 'Marriage', title: 'Get married', unit: 'one-off cost', min: 200000, max: 5000000, step: 100000, def: 1500000, note: 'A one-off cost, paid from your savings' },
  custom: { label: 'Custom', title: 'Something else', unit: 'one-off cost', min: 50000, max: 5000000, step: 50000, def: 500000, note: 'Any one-off cost, such as a trip or a big purchase' },
  loan: { label: 'Loan', title: 'Take a loan', unit: 'loan amount', min: 100000, max: 3000000, step: 50000, def: 800000, note: '5-year EMI at 11%' },
}

/**
 * Net worth year by year. events: [{ type, amount, at }] where `at` is how many years from now it happens (0 is today).
 * One-off amounts change net worth at the end of year `at`; monthly costs and extra income run from then on.
 * Returns { points, endNetWorth, monthlyRoom }. monthlyRoom is what is left to save each month once every change is running.
 */
export function projectPlan({ netWorth, monthlySave, growthPct = 9, years = 25, events = [], saveGrowthPct = 5 }) {
  const g = growthPct / 100
  const jumps = {} // year -> change to net worth (negative is a cost)
  const incomes = [] // { monthly, from }
  const costs = [] // { monthly, from, to }
  for (const e of events) {
    const at = Math.max(0, Math.min(years, Math.round(Number(e.at) || 0)))
    const a = Number(e.amount) || 0
    const jump = (v) => { jumps[at] = (jumps[at] || 0) + v }
    if (e.type === 'lumpsum') jump(a)
    else if (e.type === 'raise') incomes.push({ monthly: a, from: at })
    else if (e.type === 'child') costs.push({ monthly: a, from: at, to: at + 20 })
    else if (e.type === 'car') { jump(-a); costs.push({ monthly: a * 0.007, from: at, to: years }) }
    else if (e.type === 'home') { jump(-a * 0.2); costs.push({ monthly: emi({ principal: a * 0.8, annualRatePct: 9, years: 20 }), from: at, to: at + 20 }) }
    else if (e.type === 'loan') costs.push({ monthly: emi({ principal: a, annualRatePct: 11, years: 5 }), from: at, to: at + 5 })
    else if (e.type === 'marriage' || e.type === 'custom') jump(-a)
  }
  let nw = netWorth + (jumps[0] || 0)
  const points = [nw]
  let save = monthlySave
  for (let y = 1; y <= years; y++) {
    const cost = costs.reduce((s, c) => s + (y > c.from && y <= c.to ? c.monthly : 0), 0)
    const extra = incomes.reduce((s, i) => s + (y > i.from ? i.monthly : 0), 0)
    nw = nw * (1 + g) + (save + extra - cost) * 12 * (1 + g / 2)
    nw += jumps[y] || 0
    points.push(nw)
    save *= 1 + saveGrowthPct / 100
  }
  const monthlyRoom = monthlySave + incomes.reduce((s, i) => s + i.monthly, 0) - costs.reduce((s, c) => s + c.monthly, 0)
  return { points, endNetWorth: points[years], monthlyRoom }
}

/**
 * The earliest age you could stop working: the first year the projected net worth reaches the corpus needed to cover
 * today's monthly spending, grown by inflation, at a 4% withdrawal. Returns null if it is not reached inside the projection.
 */
export function earliestRetirementAge({ points, age, monthlyExpense, inflationPct = 6, withdrawalPct = 4 }) {
  if (!(age > 0) || !(monthlyExpense > 0)) return null
  for (let i = 0; i < points.length; i++) {
    const need = retirementCorpus({ monthlyExpenseToday: monthlyExpense, currentAge: age, retireAge: age + i, inflationPct, withdrawalPct }).corpus
    if (points[i] >= need) return age + i
  }
  return null
}

const S = { fix: 'fix', watch: 'watch', ok: 'ok', hold: 'hold' }
const band = (v, fixBelow, watchBelow) => (v < fixBelow ? S.fix : v < watchBelow ? S.watch : S.ok)

/** Rule-of-thumb money check-up. Returns groups of checks with status fix | watch | ok | hold.
 *  Growth and retirement checks are on hold until the safety basics pass. */
export function moneyCheckup({ takeHome, spend, essentials, liquid, loans = [], termCover = 0, healthCover = 0, age, retireAge, monthlyInvest = 0, retirementSavings = 0 }) {
  const annual = takeHome * 12
  const emiTotal = loans.reduce((s, l) => s + (l.emi || 0), 0)
  const months = spend > 0 ? liquid / spend : 0
  const saveRate = takeHome > 0 ? ((takeHome - spend) / takeHome) * 100 : 0
  const emiPct = takeHome > 0 ? (emiTotal / takeHome) * 100 : 0
  const costly = loans.filter((l) => l.ratePct >= 15 && l.balance > 0)
  const safety = [
    { id: 'emergency', label: 'Emergency fund', status: band(months, 3, 6), detail: `${months.toFixed(1)} months of spending` },
    { id: 'life', label: 'Life cover', status: annual > 0 ? band(termCover / annual, 5, 10) : S.hold, detail: annual > 0 ? `${(termCover / annual).toFixed(1)}× yearly income` : 'Add your income' },
    { id: 'health', label: 'Health cover', status: healthCover > 0 ? (healthCover >= annual * 0.5 ? S.ok : S.watch) : S.fix, detail: healthCover > 0 ? 'Cover in place' : 'No cover added' },
  ]
  const basicsOk = !safety.some((c) => c.status === S.fix)
  const gated = (c) => (basicsOk ? c : { ...c, status: S.hold, detail: `${c.detail} · on hold until the basics pass` })
  const borrow = [
    { id: 'costly', label: 'Expensive loans', status: costly.length ? S.fix : S.ok, detail: costly.length ? `${costly.length} at 15% or more` : 'None at 15% or more' },
    { id: 'emi', label: 'EMIs as a share of take-home', status: emiPct > 50 ? S.fix : emiPct > 40 ? S.watch : S.ok, detail: `${emiPct.toFixed(0)}%` },
  ]
  const spendSave = [
    { id: 'saverate', label: 'Savings rate', status: band(saveRate, 10, 20), detail: `${saveRate.toFixed(0)}% of take-home` },
    { id: 'essentials', label: 'Essentials share', status: takeHome > 0 && essentials > 0 ? (essentials / takeHome > 0.6 ? S.watch : S.ok) : S.hold, detail: takeHome > 0 && essentials > 0 ? `${((essentials / takeHome) * 100).toFixed(0)}% of take-home` : 'Add essentials' },
  ]
  const grow = [gated({ id: 'invest', label: 'Monthly investing', status: band(takeHome > 0 ? (monthlyInvest / takeHome) * 100 : 0, 5, 10), detail: `${takeHome > 0 ? ((monthlyInvest / takeHome) * 100).toFixed(0) : 0}% of take-home` })]
  const need = retirementCorpus({ monthlyExpenseToday: spend, currentAge: age, retireAge }).corpus
  const cover = need > 0 ? (retirementSavings * Math.pow(1.08, Math.max(retireAge - age, 0))) / need : 1
  const retire = [gated({ id: 'retire', label: 'Retirement readiness', status: age < retireAge ? band(cover * 100, 40, 80) : S.watch, detail: `${Math.round(cover * 100)}% of the estimated corpus` })]
  const groups = [
    { id: 'spend', name: 'Spend and save', question: 'Is money left over each month?', checks: spendSave },
    { id: 'safety', name: 'Safety net', question: 'Are you covered if something goes wrong?', checks: safety },
    { id: 'borrow', name: 'Borrow', question: 'Are the loans under control?', checks: borrow },
    { id: 'grow', name: 'Grow', question: 'Is your money working for you?', checks: grow },
    { id: 'retire', name: 'Retire', question: 'Will you have enough later?', checks: retire },
  ]
  const order = { fix: 0, watch: 1, hold: 2, ok: 3 }
  for (const g of groups) g.status = g.checks.reduce((w, c) => (order[c.status] < order[w] ? c.status : w), 'ok')
  const counts = { fix: 0, watch: 0, ok: 0, hold: 0 }
  for (const g of groups) for (const c of g.checks) counts[c.status]++
  return { groups, counts }
}
