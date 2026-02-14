import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Salary from '@/models/Salary'
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

    const query = { userId: user._id }
    if (isActive) {
      query.isActive = true
    }

    const salaries = await Salary.find(query)
      .populate('accountId', 'accountName icon')
      .populate('categoryId', 'name icon type')
      .sort({ createdAt: -1 })

    return NextResponse.json(salaries)
  } catch (error) {
    console.error('Error fetching salaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch salaries' },
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
      amount,
      currency,
      frequency,
      startDate,
      endDate,
      description,
      accountId,
      categoryId,
    } = body

    if (!amount || !frequency || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const salary = await Salary.create({
      userId: user._id,
      amount: parseFloat(amount),
      currency: currency || 'INR',
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      description,
      accountId: accountId || null,
      categoryId: categoryId || null,
      isActive: true,
    })

    await salary.populate('accountId', 'accountName icon')
    await salary.populate('categoryId', 'name icon type')

    return NextResponse.json(salary, { status: 201 })
  } catch (error) {
    console.error('Error creating salary:', error)
    return NextResponse.json(
      { error: 'Failed to create salary' },
      { status: 500 }
    )
  }
}

