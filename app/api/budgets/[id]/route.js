import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Budget from '@/models/Budget'
import { getAuthenticatedUser } from '@/lib/middleware/auth'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const budget = await Budget.findOne({
      _id: id,
      userId: user._id,
    }).populate('categoryId', 'name icon type')

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error fetching budget:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { name, amount, period, startDate, endDate, description, isActive } =
      body

    const budget = await Budget.findOneAndUpdate(
      { _id: id, userId: user._id },
      {
        ...(name && { name }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(period && { period }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    ).populate('categoryId', 'name icon type')

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const budget = await Budget.findOneAndDelete({
      _id: id,
      userId: user._id,
    })

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Budget deleted successfully' })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    )
  }
}

