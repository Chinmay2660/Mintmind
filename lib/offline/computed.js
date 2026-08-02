import { format } from 'date-fns'
import { getMeta } from './db'
import { listLocal, getFamilyDoc } from './repository'
import { populateTransaction } from './normalize'

function getPeriodStart(period, anchor = new Date()) {
  const now = anchor
  switch (period) {
    case '1W': {
      const start = new Date(now)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      return start
    }
    case '3M':
      return new Date(now.getFullYear(), now.getMonth() - 2, 1)
    case '6M':
      return new Date(now.getFullYear(), now.getMonth() - 5, 1)
    case '1Y':
      return new Date(now.getFullYear(), 0, 1)
    case '1M':
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

function inDateRange(dateValue, startDate, endDate) {
  const date = new Date(dateValue)
  return date >= startDate && date <= endDate
}

function filterBudgetsByPeriod(budgets, period) {
  if (!period) return budgets
  const now = new Date()
  const startDate = getPeriodStart(period, now)
  return budgets.filter(
    (budget) =>
      new Date(budget.startDate) <= now && new Date(budget.endDate) >= startDate
  )
}

async function getPopulatedTransactions(filters = {}) {
  const [transactions, categories, accounts] = await Promise.all([
    listLocal('transactions', filters),
    listLocal('categories'),
    listLocal('bankAccounts'),
  ])
  return transactions.map((row) => populateTransaction(row, categories, accounts))
}

function groupByCategory(items, type) {
  return items
    .filter((item) => item.type === type)
    .reduce((acc, item) => {
      const category = item.categoryId
      const categoryId = category?._id ?? 'uncategorized'
      const categoryName = category?.name ?? 'Uncategorized'
      const categoryIcon = category?.icon ?? '📁'
      const categoryColor = category?.color ?? '#2563eb'

      if (!acc[categoryId]) {
        acc[categoryId] = {
          categoryId,
          categoryName,
          categoryIcon,
          categoryColor,
          color: category?.color ?? null,
          total: 0,
          count: 0,
        }
      }

      acc[categoryId].total += item.amount
      acc[categoryId].count += 1
      return acc
    }, {})
}

export async function computeDashboardStats() {
  const [accounts, cashRows, investments, transactions] = await Promise.all([
    listLocal('bankAccounts'),
    listLocal('cash'),
    listLocal('investments'),
    listLocal('transactions'),
  ])

  const cash = cashRows[0]
  const totalBankBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const totalCash = cash?.amount || 0
  const totalInvestments = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const monthlyTransactions = transactions.filter((tx) =>
    inDateRange(tx.date, startOfMonth, endOfMonth)
  )

  const monthlyIncome = monthlyTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const monthlyExpenses = monthlyTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  return {
    totalBankBalance,
    totalCash,
    totalInvestments,
    netWorth: totalBankBalance + totalCash + totalInvestments,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings: monthlyIncome - monthlyExpenses,
    accountCount: accounts.length,
    investmentCount: investments.length,
  }
}

export async function computeTransactionStats(filters = {}) {
  const period = filters.period || '1M'
  const now = new Date()
  const startDate = filters.startDate
    ? new Date(filters.startDate)
    : getPeriodStart(period, now)
  const endDate = filters.endDate ? new Date(filters.endDate) : now

  const [transactions, accounts, cashRows] = await Promise.all([
    getPopulatedTransactions(),
    listLocal('bankAccounts'),
    listLocal('cash'),
  ])

  let filtered = transactions.filter((tx) => inDateRange(tx.date, startDate, endDate))

  if (filters.types) {
    const types = filters.types.split(',').filter(Boolean)
    filtered = filtered.filter((tx) => types.includes(tx.type))
  }

  const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const transferIn = filtered.filter((t) => t.type === 'transfer').reduce((s, t) => s + t.amount, 0)

  const categoryWise = Object.values(groupByCategory(filtered, 'expense'))
    .map((c) => ({
      ...c,
      percentage: expense > 0 ? (c.total / expense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  const incomeCategoryWise = Object.values(groupByCategory(filtered, 'income'))
    .map((c) => ({
      ...c,
      percentage: income > 0 ? (c.total / income) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  const monthlyBreakdown = filtered
    .filter((t) => t.type === 'expense')
    .reduce((acc, tx) => {
      const monthKey = format(new Date(tx.date), 'MMM yyyy')
      acc[monthKey] = (acc[monthKey] ?? 0) + tx.amount
      return acc
    }, {})

  const allIncome = transactions
    .filter((t) => t.type === 'income' && inDateRange(t.date, startDate, endDate))
    .reduce((s, t) => s + t.amount, 0)
  const allExpense = transactions
    .filter((t) => t.type === 'expense' && inDateRange(t.date, startDate, endDate))
    .reduce((s, t) => s + t.amount, 0)

  return {
    period,
    summary: {
      income,
      expense,
      net: income - expense,
      transferIn,
      transferOut: transferIn,
      transactionCount: filtered.length,
    },
    incomePercent: allIncome > 0 ? (income / allIncome) * 100 : 0,
    expensePercent: allExpense > 0 ? (expense / allExpense) * 100 : 0,
    categoryWise,
    incomeCategoryWise,
    monthlyBreakdown: Object.entries(monthlyBreakdown).map(([month, amount]) => ({
      month,
      amount,
    })),
    accounts: accounts.map((a) => ({
      _id: a._id,
      accountName: a.accountName,
      balance: a.balance,
      icon: a.icon,
      color: a.color,
    })),
      cashBalance: cashRows[0]?.amount ?? 0,
    transactions: filtered.map((tx) => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      description: tx.description,
      isCash: tx.isCash,
      transferToIsCash: tx.transferToIsCash,
      accountId: tx.accountId,
      transferToAccountId: tx.transferToAccountId,
      categoryId: tx.categoryId,
    })),
  }
}

export async function computeExpenseStats(filters = {}) {
  const period = filters.period || '1M'
  const now = new Date()
  const startDate = getPeriodStart(period, now)

  const transactions = await getPopulatedTransactions()
  const inPeriod = transactions.filter((tx) => inDateRange(tx.date, startDate, now))

  const expenses = inPeriod.filter((tx) => tx.type === 'expense')
  const incomes = inPeriod.filter((tx) => tx.type === 'income')

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0)

  const categoryStats = Object.values(groupByCategory(inPeriod, 'expense')).sort(
    (a, b) => b.total - a.total
  )
  const incomeCategoryStats = Object.values(groupByCategory(inPeriod, 'income')).sort(
    (a, b) => b.total - a.total
  )

  const monthlyBreakdown = expenses.reduce((acc, item) => {
    const monthKey = format(new Date(item.date), 'MMM yyyy')
    acc[monthKey] = (acc[monthKey] || 0) + item.amount
    return acc
  }, {})

  return {
    period,
    startDate,
    endDate: now,
    totalExpenses,
    totalIncome,
    netSavings: totalIncome - totalExpenses,
    categoryWise: categoryStats,
    incomeCategoryWise: incomeCategoryStats,
    monthlyBreakdown: Object.entries(monthlyBreakdown).map(([month, amount]) => ({
      month,
      amount,
    })),
    transactionCount: expenses.length + incomes.length,
  }
}

export async function computeBudgetStats(filters = {}) {
  const period = filters.period || '1M'
  const now = new Date()
  const startDate = getPeriodStart(period, now)

  const [budgets, categories, transactions] = await Promise.all([
    listLocal('budgets', { isActive: true }),
    listLocal('categories'),
    getPopulatedTransactions(),
  ])

  const activeBudgets = filterBudgetsByPeriod(budgets, period).filter(
    (budget) => new Date(budget.startDate) <= now && new Date(budget.endDate) >= startDate
  )

  const expenses = transactions.filter(
    (tx) => tx.type === 'expense' && inDateRange(tx.date, startDate, now)
  )

  const totalBudget = activeBudgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const categoryStats = activeBudgets.map((budget) => {
    const categoryId = budget.categoryId?._id ?? budget.categoryId
    const categoryExpenses = expenses.filter((expense) => {
      const expenseCategoryId = expense.categoryId?._id ?? expense.categoryId
      return expenseCategoryId === categoryId
    })
    const categoryTotal = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const category = categories.find((item) => item._id === categoryId)

    return {
      budgetId: budget._id,
      categoryId,
      categoryName: category?.name ?? budget.categoryId?.name,
      categoryIcon: category?.icon ?? budget.categoryId?.icon,
      budgetName: budget.name,
      budgetAmount: budget.amount,
      spent: categoryTotal,
      remaining: budget.amount - categoryTotal,
      percentage: budget.amount > 0 ? Math.min((categoryTotal / budget.amount) * 100, 100) : 0,
      isOverBudget: categoryTotal > budget.amount,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
    }
  })

  return {
    overall: {
      totalBudget,
      totalExpenses,
      remaining: totalBudget - totalExpenses,
      percentage: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
      isOverBudget: totalExpenses > totalBudget,
      period,
      startDate,
      endDate: now,
    },
    categories: categoryStats,
    budgets: activeBudgets.length,
    expenses: expenses.length,
  }
}

export async function computeFamilyStats() {
  const cached = await getMeta('cache:family:stats')
  if (cached) return cached

  const family = await getFamilyDoc()
  const memberCount = family?.members?.filter((m) => m.status === 'active').length ?? 0

  const [investments, transactions, budgets, salaries, accounts, cashRows] = await Promise.all([
    listLocal('investments'),
    listLocal('transactions'),
    listLocal('budgets'),
    listLocal('salary'),
    listLocal('bankAccounts'),
    listLocal('cash'),
  ])

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentTransactions = transactions.filter((tx) => new Date(tx.date) >= thirtyDaysAgo)

  return {
    totalInvestments: investments.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    totalExpenses: recentTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0),
    totalIncome: recentTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0),
    totalBudgets: budgets.reduce((sum, budget) => sum + budget.amount, 0),
    totalSalary: salaries.reduce((sum, item) => sum + item.amount, 0),
    totalBalance:
      accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) + (cashRows[0]?.amount || 0),
    memberCount: memberCount || 1,
  }
}

const COMPUTED_HANDLERS = {
  dashboardStats: computeDashboardStats,
  transactionStats: computeTransactionStats,
  expenseStats: computeExpenseStats,
  budgetStats: computeBudgetStats,
  familyStats: computeFamilyStats,
}

export async function computeStats(handler, filters = {}) {
  const fn = COMPUTED_HANDLERS[handler]
  if (!fn) throw new Error('Unknown computed route')
  return fn(filters)
}
