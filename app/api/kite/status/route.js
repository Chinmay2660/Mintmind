import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import KiteConnection from '@/models/KiteConnection'
import { requireAuth } from '@/lib/middleware/api'
import { kiteConfig } from '@/lib/kite/client'

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response
  const { configured, redirectUrl } = kiteConfig()
  if (!configured) return NextResponse.json({ configured: false, connected: false, redirectUrl })
  await connectDB()
  const conn = await KiteConnection.findOne({ userId: user._id })
  const expired = !!conn?.expiresAt && conn.expiresAt < new Date()
  // no token material is ever returned
  return NextResponse.json({ configured: true, connected: !!conn && !expired, expired, kiteUserName: conn?.kiteUserName, kiteUserId: conn?.kiteUserId, expiresAt: conn?.expiresAt, lastSyncAt: conn?.lastSyncAt })
}
