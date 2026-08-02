import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import BankAccount from '@/models/BankAccount'
import Cash from '@/models/Cash'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import { format } from 'date-fns'

function getPeriodRange(period, anchor = new Date()) {
  const now = anchor
  let startDate

  switch (period) {
    case '1W':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
      break
    case '3M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      break
    case '6M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      break
    case '1Y':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case '1M':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  return { startDate, endDate: now }
}

function buildQuery(userId, searchParams) {
  const query = { userId }
  const types = searchParams.get('types')
  if (types) {
    query.type = { $in: types.split(',').filter(Boolean) }
  }

  const accountIds = searchParams.get('accountIds')
  if (accountIds) {
    const ids = accountIds.split(',').filter(Boolean)
    query.$or = [
      { accountId: { $in: ids } },
      { transferToAccountId: { $in: ids } },
    ]
  }

  const includeCash = searchParams.get('includeCash') === 'true'
  const cashOnly = searchParams.get('cashOnly') === 'true'
  if (cashOnly) {
    query.$or = [{ isCash: true }, { transferToIsCash: true }]
  } else if (includeCash && accountIds) {
    query.$or = [
      ...(query.$or ?? []),
      { isCash: true },
      { transferToIsCash: true },
    ]
  }

  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const period = searchParams.get('period')
  if (startDate || endDate) {
    query.date = {}
    if (startDate) query.date.$gte = new Date(startDate)
    if (endDate) query.date.$lte = new Date(endDate)
  } else if (period) {
    const { startDate: start, endDate: end } = getPeriodRange(period)
    query.date = { $gte: start, $lte: end }
  }

  return query
}

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '1M'
    const query = buildQuery(user._id, searchParams)

    const [transactions, accounts, cash] = await Promise.all([
      Transaction.find(query)
        .populate('categoryId', 'name icon type color')
        .populate('accountId', 'accountName icon color')
        .populate('transferToAccountId', 'accountName icon color')
        .sort({ date: -1 }),
      BankAccount.find({ userId: user._id }),
      Cash.findOne({ userId: user._id }),
    ])

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const transferIn = transactions
      .filter((t) => t.type === 'transfer')
      .reduce((s, t) => s + t.amount, 0)
    const transferOut = transferIn

    const groupByCategory = (type) =>
      transactions
        .filter((t) => t.type === type)
        .reduce((acc, tx) => {
          const categoryId = tx.categoryId?._id?.toString() || 'uncategorized'
          const categoryName = tx.categoryId?.name || 'Uncategorized'
          const categoryIcon = tx.categoryId?.icon || '📁'
          const color = tx.categoryId?.color || null

          if (!acc[categoryId]) {
            acc[categoryId] = { categoryId, categoryName, categoryIcon, color, total: 0, count: 0 }
          }
          acc[categoryId].total += tx.amount
          acc[categoryId].count += 1
          return acc
        }, {})

    const categoryStats = Object.values(groupByCategory('expense'))
      .map((c) => ({
        ...c,
        percentage: expense > 0 ? (c.total / expense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    const incomeCategoryStats = Object.values(groupByCategory('income'))
      .map((c) => ({
        ...c,
        percentage: income > 0 ? (c.total / income) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    const monthlyBreakdown = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, tx) => {
        const monthKey = format(new Date(tx.date), 'MMM yyyy')
        acc[monthKey] = (acc[monthKey] ?? 0) + tx.amount
        return acc
      }, {})

    const totalAllIncome = await Transaction.aggregate([
      { $match: { userId: user._id, type: 'income', ...query.date ? { date: query.date } : {} } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const totalAllExpense = await Transaction.aggregate([
      { $match: { userId: user._id, type: 'expense', ...query.date ? { date: query.date } : {} } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])

    const allIncome = totalAllIncome[0]?.total ?? income
    const allExpense = totalAllExpense[0]?.total ?? expense

    return NextResponse.json({
      period,
      summary: {
        income,
        expense,
        net: income - expense,
        transferIn,
        transferOut,
        transactionCount: transactions.length,
      },
      incomePercent: allIncome > 0 ? (income / allIncome) * 100 : 0,
      expensePercent: allExpense > 0 ? (expense / allExpense) * 100 : 0,
      categoryWise: categoryStats,
      incomeCategoryWise: incomeCategoryStats,
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
      cashBalance: cash?.amount ?? 0,
      transactions: transactions.map((tx) => ({
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
    })
  } catch (error) {
    console.error('Error fetching transaction stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction stats' },
      { status: 500 }
    )
  }
}
