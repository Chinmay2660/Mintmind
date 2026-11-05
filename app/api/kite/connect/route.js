import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import { kiteConfig, loginUrl } from '@/lib/kite/client'

export async function GET() {
  const { configured, appUrl } = kiteConfig()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.redirect(new URL('/auth/signin', appUrl))
  if (!configured) return NextResponse.redirect(new URL('/dashboard/mutual-funds?kite=unconfigured', appUrl))
  const state = crypto.randomBytes(24).toString('hex') // CSRF: echoed back by Kite, compared with this cookie
  const res = NextResponse.redirect(loginUrl(state))
  res.cookies.set('kite-oauth-state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/api/kite' })
  return res
}
