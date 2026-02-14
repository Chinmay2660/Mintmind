import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Budget from '@/models/Budget'
import Transaction from '@/models/Transaction'
import { getAuthenticatedUser } from '@/lib/middleware/auth'

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

    // Get all active budgets for the period
    const budgets = await Budget.find({
      userId: user._id,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: startDate },
    }).populate('categoryId', 'name icon type')

    // Get expenses for the period
    const expenses = await Transaction.find({
      userId: user._id,
      type: 'expense',
      date: { $gte: startDate, $lte: now },
    }).populate('categoryId', 'name icon type')

    // Calculate total budget and expenses
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    )

    // Calculate category-wise budget vs expenses
    const categoryStats = budgets.map((budget) => {
      const categoryExpenses = expenses.filter(
        (expense) =>
          expense.categoryId?._id?.toString() ===
          budget.categoryId?._id?.toString()
      )

      const categoryTotal = categoryExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      )

      const remaining = budget.amount - categoryTotal
      const percentage = budget.amount > 0 ? (categoryTotal / budget.amount) * 100 : 0

      return {
        budgetId: budget._id,
        categoryId: budget.categoryId?._id,
        categoryName: budget.categoryId?.name,
        categoryIcon: budget.categoryId?.icon,
        budgetName: budget.name,
        budgetAmount: budget.amount,
        spent: categoryTotal,
        remaining: remaining,
        percentage: Math.min(percentage, 100),
        isOverBudget: categoryTotal > budget.amount,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
      }
    })

    // Overall stats
    const overallStats = {
      totalBudget,
      totalExpenses,
      remaining: totalBudget - totalExpenses,
      percentage: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
      isOverBudget: totalExpenses > totalBudget,
      period,
      startDate,
      endDate: now,
    }

    return NextResponse.json({
      overall: overallStats,
      categories: categoryStats,
      budgets: budgets.length,
      expenses: expenses.length,
    })
  } catch (error) {
    console.error('Error fetching budget stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget stats' },
      { status: 500 }
    )
  }
}

