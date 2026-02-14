import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import RecurringExpense from '@/models/RecurringExpense'
import { getAuthenticatedUser } from '@/lib/middleware/auth'

export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const expense = await RecurringExpense.findOne({
      _id: params.id,
      userId: user._id,
    })
      .populate('categoryId', 'name icon type')
      .populate('accountId', 'accountName icon')

    if (!expense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error fetching recurring expense:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring expense' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
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
      isActive,
    } = body

    const updateData = {
      ...(name !== undefined && { name }),
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(frequency && { frequency }),
      ...(customDays !== undefined && { customDays: frequency === 'custom' ? customDays : null }),
      ...(dayOfWeek !== undefined && { dayOfWeek: frequency === 'weekly' ? dayOfWeek : null }),
      ...(dayOfMonth !== undefined && { dayOfMonth: ['monthly', 'quarterly'].includes(frequency) ? dayOfMonth : null }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(categoryId !== undefined && { categoryId }),
      ...(accountId !== undefined && { accountId: isCash ? null : (accountId || null) }),
      ...(isCash !== undefined && { isCash }),
      ...(description !== undefined && { description }),
      ...(autoCreateTransaction !== undefined && { autoCreateTransaction }),
      ...(isActive !== undefined && { isActive }),
    }

    // Recalculate next due date if frequency or start date changed
    if (frequency || startDate) {
      const expense = await RecurringExpense.findById(params.id)
      if (expense) {
        const start = startDate ? new Date(startDate) : expense.startDate
        const freq = frequency || expense.frequency
        const custom = customDays !== undefined ? customDays : expense.customDays
        const dow = dayOfWeek !== undefined ? dayOfWeek : expense.dayOfWeek
        const dom = dayOfMonth !== undefined ? dayOfMonth : expense.dayOfMonth

        let nextDueDate = new Date(start)

        switch (freq) {
          case 'daily':
            nextDueDate.setDate(nextDueDate.getDate() + 1)
            break
          case 'weekly':
            if (dow !== null && dow !== undefined) {
              const daysUntil = (dow - nextDueDate.getDay() + 7) % 7
              nextDueDate.setDate(nextDueDate.getDate() + (daysUntil || 7))
            } else {
              nextDueDate.setDate(nextDueDate.getDate() + 7)
            }
            break
          case 'monthly':
            if (dom) {
              nextDueDate.setDate(dom)
              if (nextDueDate <= start) {
                nextDueDate.setMonth(nextDueDate.getMonth() + 1)
              }
            } else {
              nextDueDate.setMonth(nextDueDate.getMonth() + 1)
            }
            break
          case 'quarterly':
            if (dom) {
              nextDueDate.setDate(dom)
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
            if (custom) {
              nextDueDate.setDate(nextDueDate.getDate() + custom)
            }
            break
        }

        updateData.nextDueDate = nextDueDate
      }
    }

    const expense = await RecurringExpense.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('categoryId', 'name icon type')
      .populate('accountId', 'accountName icon')

    if (!expense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating recurring expense:', error)
    return NextResponse.json(
      { error: 'Failed to update recurring expense' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const expense = await RecurringExpense.findOneAndDelete({
      _id: params.id,
      userId: user._id,
    })

    if (!expense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Recurring expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting recurring expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete recurring expense' },
      { status: 500 }
    )
  }
}

