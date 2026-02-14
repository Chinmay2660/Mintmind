import { NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name || user.email?.split('@')[0] || 'User',
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        image: user.image || null,
      },
    })
  } catch (error) {
    return NextResponse.json({ user: null })
  }
}

