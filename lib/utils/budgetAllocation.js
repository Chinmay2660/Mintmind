export function startOfMonth(d) {
  const date = new Date(d)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(d, n) {
  const date = new Date(d)
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

/** Equal monthly slices for budget reporting (cash flow unchanged). */
export function getBudgetAllocations(expense) {
  const amount = Number(expense.amount) || 0
  if (!expense.budgetSplitEnabled || !expense.budgetSplitMonths || expense.budgetSplitMonths <= 1) {
    return [{ monthStart: startOfMonth(expense.date), amount }]
  }

  const months = expense.budgetSplitMonths
  const start = startOfMonth(expense.budgetSplitStartMonth || expense.date)
  const base = Math.floor((amount * 100) / months) / 100
  const allocations = []
  let allocated = 0

  for (let i = 0; i < months; i++) {
    const isLast = i === months - 1
    const slice = isLast ? Math.round((amount - allocated) * 100) / 100 : base
    allocations.push({ monthStart: addMonths(start, i), amount: slice })
    allocated += slice
  }

  return allocations
}

export function getExpenseBudgetAmountInRange(expense, rangeStart, rangeEnd) {
  const rangeStartMonth = startOfMonth(rangeStart)
  const rangeEndMonth = startOfMonth(rangeEnd)

  return getBudgetAllocations(expense)
    .filter((a) => a.monthStart >= rangeStartMonth && a.monthStart <= rangeEndMonth)
    .reduce((sum, a) => sum + a.amount, 0)
}

export function expenseOverlapsBudgetPeriod(expense, rangeStart, rangeEnd) {
  return getExpenseBudgetAmountInRange(expense, rangeStart, rangeEnd) > 0
}

// ponytail: dev-only sanity check for split math
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const slices = getBudgetAllocations({
    amount: 10000,
    date: '2026-01-15',
    budgetSplitEnabled: true,
    budgetSplitMonths: 2,
    budgetSplitStartMonth: '2026-01-01',
  })
  const jan = getExpenseBudgetAmountInRange(
    { amount: 10000, date: '2026-01-15', budgetSplitEnabled: true, budgetSplitMonths: 2, budgetSplitStartMonth: '2026-01-01' },
    new Date('2026-01-01'),
    new Date('2026-01-31')
  )
  if (slices.length !== 2 || slices[0].amount !== 5000 || jan !== 5000) {
    throw new Error('budgetAllocation self-check failed')
  }
}
