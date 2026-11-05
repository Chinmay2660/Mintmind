import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import { buildAuthUrl, driveConfig } from '@/lib/google/drive'

export async function GET(request) {
  const user = await getAuthenticatedUser()
  const { configured, appUrl } = driveConfig()
  if (!user) return NextResponse.redirect(new URL('/auth/signin', appUrl))
  if (!configured) return NextResponse.redirect(new URL('/dashboard/settings?drive=unconfigured', appUrl))
  // CSRF protection: random state bound to this browser via an httpOnly cookie
  const state = crypto.randomBytes(24).toString('hex')
  const res = NextResponse.redirect(buildAuthUrl(state))
  res.cookies.set('drive-oauth-state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/api/drive' })
  return res
}
