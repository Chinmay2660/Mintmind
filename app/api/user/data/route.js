import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import Category from '@/models/Category'
import Transaction from '@/models/Transaction'
import BankAccount from '@/models/BankAccount'
import Cash from '@/models/Cash'
import Investment from '@/models/Investment'
import Budget from '@/models/Budget'
import Salary from '@/models/Salary'
import RecurringExpense from '@/models/RecurringExpense'
import Goal from '@/models/Goal'
import PairCode from '@/models/PairCode'
import Insurance from '@/models/Insurance'
import CreditCard from '@/models/CreditCard'

async function deleteUserData(userId) {
  await Promise.all([
    Category.deleteMany({ userId }),
    Transaction.deleteMany({ userId }),
    BankAccount.deleteMany({ userId }),
    Cash.deleteMany({ userId }),
    Investment.deleteMany({ userId }),
    Budget.deleteMany({ userId }),
    Salary.deleteMany({ userId }),
    RecurringExpense.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    PairCode.deleteMany({ userId }),
    Insurance.deleteMany({ userId }),
    CreditCard.deleteMany({ userId }),
  ])
}

export async function DELETE() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    await deleteUserData(user._id)

    return NextResponse.json({ message: 'All personal data reset successfully' })
  } catch (error) {
    console.error('Error resetting user data:', error)
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 })
  }
}
