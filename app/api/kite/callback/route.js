import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import { createSession, kiteConfig, saveSession } from '@/lib/kite/client'

export async function GET(request) {
  const { appUrl } = kiteConfig()
  const back = (q) => {
    const res = NextResponse.redirect(`${appUrl}/dashboard/mutual-funds?${q}`)
    res.cookies.set('kite-oauth-state', '', { path: '/api/kite', maxAge: 0 })
    return res
  }
  const url = new URL(request.url)
  const requestToken = url.searchParams.get('request_token')
  const state = url.searchParams.get('state')
  const expected = request.cookies.get('kite-oauth-state')?.value
  if (url.searchParams.get('status') !== 'success' || !requestToken) return back('kite=denied')
  if (!state || !expected || state !== expected) return back('kite=invalid_state')

  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.redirect(`${appUrl}/auth/signin`)
  try {
    const data = await createSession(requestToken)
    await connectDB()
    await saveSession(user._id, data)
    return back('kite=connected')
  } catch {
    return back('kite=failed')
  }
}
