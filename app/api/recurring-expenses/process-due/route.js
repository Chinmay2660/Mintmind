import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import RecurringExpense from '@/models/RecurringExpense'
import Transaction from '@/models/Transaction'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import { applyTransactionBalances } from '@/lib/api/transactionBalance'

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const now = new Date()
    const dueExpenses = await RecurringExpense.find({
      userId: user._id,
      isActive: true,
      autoCreateTransaction: true,
      nextDueDate: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    })

    const created = []

    for (const expense of dueExpenses) {
      const transaction = await Transaction.create({
        userId: user._id,
        type: 'expense',
        amount: expense.amount,
        categoryId: expense.categoryId,
        accountId: expense.isCash ? null : expense.accountId,
        isCash: expense.isCash,
        description: expense.description || expense.name,
        date: expense.nextDueDate,
      })

      await applyTransactionBalances(user._id, transaction)

      expense.nextDueDate = expense.calculateNextDueDate(expense.nextDueDate)
      await expense.save()

      created.push({
        recurringExpenseId: expense._id,
        transactionId: transaction._id,
        name: expense.name,
        amount: expense.amount,
      })
    }

    return NextResponse.json({ processed: created.length, created })
  } catch (error) {
    console.error('Error processing recurring expenses:', error)
    return NextResponse.json(
      { error: 'Failed to process recurring expenses' },
      { status: 500 }
    )
  }
}
