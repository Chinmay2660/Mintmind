import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { rateLimitOrRespond } from '@/lib/middleware/api'
import { googleSignInConfig, safeNext, STATE_COOKIE, cookieOpts } from '@/lib/google/signin'

/** Starts Google sign-in without a popup: send the browser to Google, which sends it back to /api/auth/google/callback. */
export async function GET(request) {
  const limited = rateLimitOrRespond(request, { name: 'auth-google-start', limit: 20, windowMs: 15 * 60 * 1000 })
  if (limited) return limited
  const { clientId, configured, appUrl, redirectUri } = googleSignInConfig(request)
  if (!configured) return NextResponse.redirect(new URL('/auth/signin?error=google_unconfigured', appUrl))
  const state = crypto.randomBytes(24).toString('hex')
  const next = safeNext(new URL(request.url).searchParams.get('next'))
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }).toString()
  const res = NextResponse.redirect(url)
  // the state is bound to this browser, so a link someone else started cannot sign this browser in
  res.cookies.set(STATE_COOKIE, JSON.stringify({ state, next }), cookieOpts(600))
  return res
}
