import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { kiteConfig, loginUrl } from '@/lib/kite/client'

/** Internal. The app owner opens /api/internal/kite/login?key=$CRON_SECRET once on a sync day to start the Zerodha login. */
export async function GET(request) {
  const secret = process.env.CRON_SECRET
  const key = new URL(request.url).searchParams.get('key') || ''
  const ok = !!secret && key.length === secret.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(secret))
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!kiteConfig().configured) return NextResponse.json({ error: 'KITE_API_KEY / KITE_API_SECRET are not set' }, { status: 503 })
  const state = crypto.randomBytes(16).toString('hex')
  const res = NextResponse.redirect(loginUrl(state))
  res.cookies.set('kite-oauth-state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/api/internal/kite' })
  return res
}
