import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import DriveConnection from '@/models/DriveConnection'
import { requireAuth } from '@/lib/middleware/api'
import { revokeToken } from '@/lib/google/drive'

/** Revokes the grant at Google and forgets the token. Drive files and our metadata are kept. */
export async function POST() {
  const { user, response } = await requireAuth()
  if (response) return response
  await connectDB()
  await revokeToken(user._id)
  await DriveConnection.deleteOne({ userId: user._id })
  return NextResponse.json({ success: true })
}
