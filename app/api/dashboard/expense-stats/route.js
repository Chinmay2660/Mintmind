import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import { format } from 'date-fns'

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '1M' // '1M', '3M', '6M', '1Y'

    // Calculate date range based on period
    const now = new Date()
    let startDate

    switch (period) {
      case '1M':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
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
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const dateFilter = { $gte: startDate, $lte: now }

    const [expenses, incomes] = await Promise.all([
      Transaction.find({ userId: user._id, type: 'expense', date: dateFilter })
        .populate('categoryId', 'name icon type color'),
      Transaction.find({ userId: user._id, type: 'income', date: dateFilter })
        .populate('categoryId', 'name icon type color'),
    ])

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0)

    const groupByCategory = (items) =>
      items.reduce((acc, item) => {
        const categoryId = item.categoryId?._id?.toString() || 'uncategorized'
        const categoryName = item.categoryId?.name || 'Uncategorized'
        const categoryIcon = item.categoryId?.icon || '📁'
        const categoryColor = item.categoryId?.color || '#2563eb'

        if (!acc[categoryId]) {
          acc[categoryId] = {
            categoryId,
            categoryName,
            categoryIcon,
            categoryColor,
            total: 0,
            count: 0,
          }
        }

        acc[categoryId].total += item.amount
        acc[categoryId].count += 1
        return acc
      }, {})

    const categoryWise = groupByCategory(expenses)
    const incomeCategoryWise = groupByCategory(incomes)

    const categoryStats = Object.values(categoryWise).sort((a, b) => b.total - a.total)
    const incomeCategoryStats = Object.values(incomeCategoryWise).sort((a, b) => b.total - a.total)

    const monthlyBreakdown = expenses.reduce((acc, expense) => {
      const monthKey = format(new Date(expense.date), 'MMM yyyy')
      acc[monthKey] = (acc[monthKey] || 0) + expense.amount
      return acc
    }, {})

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error fetching expense stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense stats' },
      { status: 500 }
    )
  }
}

