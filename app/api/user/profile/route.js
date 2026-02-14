import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { getAuthenticatedUser } from '@/lib/middleware/auth'

export async function PUT(request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { firstName, lastName, image } = body

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(image !== undefined && { image }),
        // Update name if firstName or lastName changed
        ...(firstName !== undefined || lastName !== undefined
          ? {
              name: [firstName || user.firstName || '', lastName || user.lastName || '']
                .filter(Boolean)
                .join(' ') || user.name,
            }
          : {}),
      },
      { new: true, runValidators: true }
    )

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        image: updatedUser.image,
      },
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

