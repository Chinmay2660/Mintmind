import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api'
import { isDemoModeEnabled, isUserDataEmpty, seedUserDemoData } from '@/lib/seed/demoData'

export async function GET() {
  try {
    if (!isDemoModeEnabled()) {
      return NextResponse.json({ demoMode: false, empty: false })
    }

    await connectDB()
    const { user, response } = await requireAuth()
    if (response) return response

    const empty = await isUserDataEmpty(user._id)
    return NextResponse.json({ demoMode: true, empty })
  } catch (error) {
    return safeErrorResponse(error, 'Failed to check demo data status')
  }
}

export async function POST(request) {
  try {
    if (!isDemoModeEnabled()) {
      return NextResponse.json({ error: 'Demo seeding is disabled' }, { status: 403 })
    }

    await connectDB()
    const { user, response } = await requireAuth()
    if (response) return response

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const result = await seedUserDemoData(user._id, user.name || user.email, { force })

    return NextResponse.json(result)
  } catch (error) {
    return safeErrorResponse(error, 'Failed to seed demo data')
  }
}
