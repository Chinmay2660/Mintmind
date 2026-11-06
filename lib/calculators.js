// Planning calculators (pure, tested). They show what-if arithmetic from the numbers you type;
// returns are assumptions you choose, not predictions, and nothing is stored or sent anywhere.

/** Future value of a monthly SIP at an assumed annual return (end-of-month contributions). */
export function sipFutureValue({ monthly, annualReturnPct, years, stepUpPct = 0 }) {
  const r = annualReturnPct / 100 / 12
  let fv = 0
  let invested = 0
  let m = monthly
  for (let y = 0; y < years; y++) {
    for (let i = 0; i < 12; i++) {
      fv = (fv + m) * (1 + r)
      invested += m
    }
    m *= 1 + stepUpPct / 100
  }
  return { futureValue: Math.round(fv), invested: Math.round(invested), gain: Math.round(fv - invested) }
}

/** Monthly SIP needed to reach a target (flat contributions). */
export function goalSip({ target, annualReturnPct, years, existing = 0 }) {
  const n = years * 12
  const r = annualReturnPct / 100 / 12
  const grownExisting = existing * Math.pow(1 + r, n)
  const need = Math.max(target - grownExisting, 0)
  if (need === 0) return 0
  if (r === 0) return Math.ceil(need / n)
  return Math.ceil((need * r) / ((Math.pow(1 + r, n) - 1) * (1 + r)))
}

export function emi({ principal, annualRatePct, years }) {
  const n = years * 12
  const r = annualRatePct / 100 / 12
  if (r === 0) return Math.round(principal / n)
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
}

/** Interest saved and months cut by paying `extra` more each month. */
export function prepayment({ principal, annualRatePct, years, extraMonthly = 0, lumpsum = 0 }) {
  const r = annualRatePct / 100 / 12
  const base = emi({ principal, annualRatePct, years })
  const run = (extra, lump) => {
    let bal = principal - lump
    let months = 0
    let interest = 0
    while (bal > 0.5 && months < 1200) {
      const i = bal * r
      interest += i
      bal = bal + i - (base + extra)
      months++
    }
    return { months, interest: Math.round(interest) }
  }
  const a = run(0, 0)
  const b = run(extraMonthly, lumpsum)
  return { emi: base, before: a, after: b, interestSaved: a.interest - b.interest, monthsSaved: a.months - b.months }
}

/** Corpus needed at retirement for inflation-adjusted yearly spending, using a withdrawal rate (default 4%). */
export function retirementCorpus({ monthlyExpenseToday, currentAge, retireAge, inflationPct = 6, withdrawalPct = 4 }) {
  const years = Math.max(retireAge - currentAge, 0)
  const future = monthlyExpenseToday * 12 * Math.pow(1 + inflationPct / 100, years)
  return { yearsToRetire: years, yearlyExpenseAtRetirement: Math.round(future), corpus: Math.round(future / (withdrawalPct / 100)) }
}

/** Rent vs buy over N years with explicit assumptions. Returns both net positions. */
export function rentVsBuy({ price, downPaymentPct, loanRatePct, loanYears, monthlyRent, rentGrowthPct = 5, appreciationPct = 5, investReturnPct = 10, years }) {
  const down = (price * downPaymentPct) / 100
  const principal = price - down
  const payment = emi({ principal, annualRatePct: loanRatePct, years: loanYears })
  let rent = monthlyRent
  let rentInvest = down // renter invests the down payment
  const r = investReturnPct / 100 / 12
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      rentInvest = rentInvest * (1 + r) + Math.max(payment - rent, 0)
    }
    rent *= 1 + rentGrowthPct / 100
  }
  const rr = loanRatePct / 100 / 12
  let bal = principal
  for (let m = 0; m < Math.min(years, loanYears) * 12; m++) bal = bal * (1 + rr) - payment
  const homeValue = price * Math.pow(1 + appreciationPct / 100, years)
  return { emi: payment, buyNetWorth: Math.round(homeValue - Math.max(bal, 0)), rentNetWorth: Math.round(rentInvest), better: homeValue - Math.max(bal, 0) > rentInvest ? 'buy' : 'rent' }
}

/** Lump sum grown at an assumed yearly return, with doubling time (rule-of-72 style, exact). */
export function lumpsumFuture({ amount, annualReturnPct, years }) {
  const g = Math.pow(1 + annualReturnPct / 100, years)
  const futureValue = Math.round(amount * g)
  const doubleYears = annualReturnPct > 0 ? Math.log(2) / Math.log(1 + annualReturnPct / 100) : null
  return { futureValue, gain: futureValue - Math.round(amount), doubleYears }
}

/** Yearly growth rate that turns `start` into `end` over `years`. */
export function cagr({ start, end, years }) {
  if (!(start > 0) || !(years > 0) || end < 0) return null
  return (Math.pow(end / start, 1 / years) - 1) * 100
}

/** Months of spending covered by savings, and months to reach a target by saving monthly. */
export function emergencyFund({ monthlyExpense, savings, targetMonths = 6, monthlySaving = 0 }) {
  const target = monthlyExpense * targetMonths
  const coveredMonths = monthlyExpense > 0 ? savings / monthlyExpense : 0
  const gap = Math.max(target - savings, 0)
  const monthsToTarget = gap === 0 ? 0 : monthlySaving > 0 ? Math.ceil(gap / monthlySaving) : null
  return { target, coveredMonths, gap, monthsToTarget }
}

/** Life cover needed: income replacement for `years` plus debts and goals, less existing cover and liquid assets. */
export function termCover({ annualIncome, years = 15, debts = 0, goals = 0, existingCover = 0, liquidAssets = 0 }) {
  const need = annualIncome * years + debts + goals
  const have = existingCover + liquidAssets
  return { need, have, gap: Math.max(need - have, 0) }
}

/** 50/30/20-style split of take-home pay. */
export function budgetRule({ income, needsPct = 50, wantsPct = 30 }) {
  const savingsPct = Math.max(100 - needsPct - wantsPct, 0)
  const part = (p) => Math.round((income * p) / 100)
  return { needs: part(needsPct), wants: part(wantsPct), savings: part(savingsPct), savingsPct }
}

/** Pay several loans off: 'avalanche' targets the highest rate first, 'snowball' the smallest balance.
 *  Any budget above the sum of minimum EMIs goes to the focus loan. Returns months to debt-free and total interest. */
export function loanPayoff({ loans, extraMonthly = 0, strategy = 'avalanche' }) {
  const L = loans.filter((l) => l.balance > 0).map((l) => ({ ...l, bal: l.balance }))
  let months = 0
  let interest = 0
  while (L.some((l) => l.bal > 0.5) && months < 1200) {
    months++
    for (const l of L) if (l.bal > 0) { const i = (l.bal * l.ratePct) / 1200; l.bal += i; interest += i }
    let pool = extraMonthly
    for (const l of L) if (l.bal > 0) { const pay = Math.min(l.emi, l.bal); l.bal -= pay; pool += l.emi - pay }
    const order = L.filter((l) => l.bal > 0).sort((a, b) => (strategy === 'snowball' ? a.bal - b.bal : b.ratePct - a.ratePct))
    for (const l of order) { if (pool <= 0) break; const pay = Math.min(pool, l.bal); l.bal -= pay; pool -= pay }
  }
  return { months, interest: Math.round(interest), converged: months < 1200 }
}
