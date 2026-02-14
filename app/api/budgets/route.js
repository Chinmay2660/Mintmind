import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Budget from '@/models/Budget'
import { getAuthenticatedUser } from '@/lib/middleware/auth'

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') // '1M', '3M', '6M', '1Y'
    const isActive = searchParams.get('isActive') !== 'false'

    const query = { userId: user._id }
    if (isActive) {
      query.isActive = true
    }

    let budgets = await Budget.find(query)
      .populate('categoryId', 'name icon type')
      .sort({ createdAt: -1 })

    // Filter by period if specified
    if (period) {
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
          startDate = null
      }

      if (startDate) {
        budgets = budgets.filter(
          (budget) =>
            budget.startDate <= now && budget.endDate >= startDate
        )
      }
    }

    return NextResponse.json(budgets)
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { categoryId, name, amount, period, startDate, endDate, description } =
      body

    if (!categoryId || !name || !amount || !period || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const budget = await Budget.create({
      userId: user._id,
      categoryId,
      name,
      amount: parseFloat(amount),
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
      isActive: true,
    })

    await budget.populate('categoryId', 'name icon type')

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    )
  }
}

