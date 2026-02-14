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

    // Get expenses for the period
    const expenses = await Transaction.find({
      userId: user._id,
      type: 'expense',
      date: { $gte: startDate, $lte: now },
    }).populate('categoryId', 'name icon type')

    // Calculate total expenses
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    )

    // Group by category
    const categoryWise = expenses.reduce((acc, expense) => {
      const categoryId = expense.categoryId?._id?.toString() || 'uncategorized'
      const categoryName = expense.categoryId?.name || 'Uncategorized'
      const categoryIcon = expense.categoryId?.icon || '📁'

      if (!acc[categoryId]) {
        acc[categoryId] = {
          categoryId,
          categoryName,
          categoryIcon,
          total: 0,
          count: 0,
          transactions: [],
        }
      }

      acc[categoryId].total += expense.amount
      acc[categoryId].count += 1
      acc[categoryId].transactions.push(expense)

      return acc
    }, {})

    // Convert to array and sort by total
    const categoryStats = Object.values(categoryWise).sort(
      (a, b) => b.total - a.total
    )

    // Monthly breakdown
    const monthlyBreakdown = expenses.reduce((acc, expense) => {
      const monthKey = format(new Date(expense.date), 'MMM yyyy')
      if (!acc[monthKey]) {
        acc[monthKey] = 0
      }
      acc[monthKey] += expense.amount
      return acc
    }, {})

    return NextResponse.json({
      period,
      startDate,
      endDate: now,
      totalExpenses,
      categoryWise: categoryStats,
      monthlyBreakdown: Object.entries(monthlyBreakdown).map(([month, amount]) => ({
        month,
        amount,
      })),
      transactionCount: expenses.length,
    })
  } catch (error) {
    console.error('Error fetching expense stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense stats' },
      { status: 500 }
    )
  }
}

