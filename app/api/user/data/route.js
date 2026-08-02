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
import Family from '@/models/Family'
import FamilyGoal from '@/models/FamilyGoal'
import FamilyBudget from '@/models/FamilyBudget'
import FamilyExpense from '@/models/FamilyExpense'

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
  ])
}

export async function DELETE() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const family = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 'members.user': user._id, 'members.status': 'active' },
      ],
    })

    if (family) {
      const isHead = family.familyHead.toString() === user._id.toString()

      if (isHead) {
        const otherActiveMembers = family.members.filter(
          (member) =>
            member.status === 'active' &&
            member.user.toString() !== user._id.toString()
        )

        if (otherActiveMembers.length > 0) {
          return NextResponse.json(
            {
              error:
                'You are the family head with other members. Transfer headship or remove all members before resetting data.',
            },
            { status: 400 }
          )
        }

        const familyId = family._id
        await Promise.all([
          FamilyGoal.deleteMany({ familyId }),
          FamilyBudget.deleteMany({ familyId }),
          FamilyExpense.deleteMany({ familyId }),
          PairCode.deleteMany({ familyId }),
          Family.findByIdAndDelete(familyId),
        ])
      }
    }

    await deleteUserData(user._id)

    return NextResponse.json({ message: 'All data reset successfully' })
  } catch (error) {
    console.error('Error resetting user data:', error)
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 })
  }
}
