import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import RecurringExpense from '@/models/RecurringExpense'
import { getAuthenticatedUser } from '@/lib/middleware/auth'

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive') !== 'false'
    const frequency = searchParams.get('frequency')

    const query = { userId: user._id }
    if (isActive) {
      query.isActive = true
    }
    if (frequency) {
      query.frequency = frequency
    }

    const expenses = await RecurringExpense.find(query)
      .populate('categoryId', 'name icon type')
      .populate('accountId', 'accountName icon')
      .sort({ nextDueDate: 1 })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching recurring expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring expenses' },
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
    const {
      name,
      amount,
      frequency,
      customDays,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
      categoryId,
      accountId,
      isCash,
      description,
      autoCreateTransaction,
    } = body

    if (!name || !amount || !frequency || !startDate || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate next due date
    const start = new Date(startDate)
    let nextDueDate = new Date(start)

    switch (frequency) {
      case 'daily':
        nextDueDate.setDate(nextDueDate.getDate() + 1)
        break
      case 'weekly':
        if (dayOfWeek !== null && dayOfWeek !== undefined) {
          const daysUntil = (dayOfWeek - nextDueDate.getDay() + 7) % 7
          nextDueDate.setDate(nextDueDate.getDate() + (daysUntil || 7))
        } else {
          nextDueDate.setDate(nextDueDate.getDate() + 7)
        }
        break
      case 'monthly':
        if (dayOfMonth) {
          nextDueDate.setDate(dayOfMonth)
          if (nextDueDate <= start) {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1)
          }
        } else {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1)
        }
        break
      case 'quarterly':
        if (dayOfMonth) {
          nextDueDate.setDate(dayOfMonth)
          if (nextDueDate <= start) {
            nextDueDate.setMonth(nextDueDate.getMonth() + 3)
          } else {
            nextDueDate.setMonth(nextDueDate.getMonth() + 3)
          }
        } else {
          nextDueDate.setMonth(nextDueDate.getMonth() + 3)
        }
        break
      case 'custom':
        if (customDays) {
          nextDueDate.setDate(nextDueDate.getDate() + customDays)
        } else {
          return NextResponse.json(
            { error: 'customDays is required for custom frequency' },
            { status: 400 }
          )
        }
        break
    }

    const expense = await RecurringExpense.create({
      userId: user._id,
      name,
      amount: parseFloat(amount),
      frequency,
      customDays: frequency === 'custom' ? customDays : null,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
      dayOfMonth: ['monthly', 'quarterly'].includes(frequency) ? dayOfMonth : null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      nextDueDate,
      categoryId,
      accountId: isCash ? null : (accountId || null),
      isCash: isCash || false,
      description,
      autoCreateTransaction: autoCreateTransaction || false,
      isActive: true,
    })

    await expense.populate('categoryId', 'name icon type')
    await expense.populate('accountId', 'accountName icon')

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating recurring expense:', error)
    return NextResponse.json(
      { error: 'Failed to create recurring expense' },
      { status: 500 }
    )
  }
}

