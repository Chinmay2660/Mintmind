import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import DriveConnection from '@/models/DriveConnection'
import DriveDocument from '@/models/DriveDocument'
import { requireAuth } from '@/lib/middleware/api'
import { revokeToken } from '@/lib/google/drive'
import { invalidateUserCache } from '@/lib/auth'

/** Permanently deletes the account and server-side records. Google Drive files are not touched. */
export async function DELETE() {
  const { user, response } = await requireAuth()
  if (response) return response
  await connectDB()
  await revokeToken(user._id)
  await Promise.all([DriveConnection.deleteMany({ userId: user._id }), DriveDocument.deleteMany({ userId: user._id })])
  await User.deleteOne({ _id: user._id })
  invalidateUserCache(user._id)
  const res = NextResponse.json({ success: true })
  res.cookies.set('auth-token', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
