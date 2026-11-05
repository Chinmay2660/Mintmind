import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import KiteConnection from '@/models/KiteConnection'
import { requireAuth } from '@/lib/middleware/api'
import { invalidateSession } from '@/lib/kite/client'

export async function POST() {
  const { user, response } = await requireAuth()
  if (response) return response
  await connectDB()
  await invalidateSession(user._id)
  await KiteConnection.deleteOne({ userId: user._id })
  return NextResponse.json({ success: true })
}
