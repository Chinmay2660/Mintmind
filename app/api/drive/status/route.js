import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import DriveConnection from '@/models/DriveConnection'
import { requireAuth } from '@/lib/middleware/api'
import { driveConfig } from '@/lib/google/drive'

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response
  const { configured } = driveConfig()
  if (!configured) return NextResponse.json({ configured: false, connected: false })
  await connectDB()
  const conn = await DriveConnection.findOne({ userId: user._id })
  if (!conn) return NextResponse.json({ configured: true, connected: false })
  // never return token material
  return NextResponse.json({ configured: true, connected: conn.status === 'connected', reason: conn.status === 'expired' ? 'expired' : undefined, email: conn.email })
}
