import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Salary from '@/models/Salary'
import { getAuthenticatedUser } from '@/lib/middleware/auth'

export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const salary = await Salary.findOne({
      _id: params.id,
      userId: user._id,
    })
      .populate('accountId', 'accountName icon')
      .populate('categoryId', 'name icon type')

    if (!salary) {
      return NextResponse.json({ error: 'Salary not found' }, { status: 404 })
    }

    return NextResponse.json(salary)
  } catch (error) {
    console.error('Error fetching salary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch salary' },
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
      amount,
      currency,
      frequency,
      startDate,
      endDate,
      description,
      accountId,
      categoryId,
      isActive,
    } = body

    const salary = await Salary.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(currency && { currency }),
        ...(frequency && { frequency }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(description !== undefined && { description }),
        ...(accountId !== undefined && { accountId: accountId || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    )
      .populate('accountId', 'accountName icon')
      .populate('categoryId', 'name icon type')

    if (!salary) {
      return NextResponse.json({ error: 'Salary not found' }, { status: 404 })
    }

    return NextResponse.json(salary)
  } catch (error) {
    console.error('Error updating salary:', error)
    return NextResponse.json(
      { error: 'Failed to update salary' },
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

    const salary = await Salary.findOneAndDelete({
      _id: params.id,
      userId: user._id,
    })

    if (!salary) {
      return NextResponse.json({ error: 'Salary not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Salary deleted successfully' })
  } catch (error) {
    console.error('Error deleting salary:', error)
    return NextResponse.json(
      { error: 'Failed to delete salary' },
      { status: 500 }
    )
  }
}

