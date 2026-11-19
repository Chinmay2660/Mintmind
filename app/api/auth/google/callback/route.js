import { NextResponse } from 'next/server'
import { getOrCreateGoogleUser, generateToken } from '@/lib/auth'
import { googleSignInConfig, safeNext, STATE_COOKIE, cookieOpts } from '@/lib/google/signin'

/** Google sends the browser back here with a one-time code. It is swapped for the person's profile and the app's own session cookie. */
export async function GET(request) {
  const { clientId, clientSecret, appUrl, redirectUri } = googleSignInConfig(request)
  const fail = (code) => {
    const res = NextResponse.redirect(new URL(`/auth/signin?error=${code}`, appUrl))
    res.cookies.set(STATE_COOKIE, '', cookieOpts(0))
    return res
  }
  const params = new URL(request.url).searchParams
  if (params.get('error')) return fail(params.get('error') === 'access_denied' ? 'google_denied' : 'google_failed')

  let saved
  try { saved = JSON.parse(request.cookies.get(STATE_COOKIE)?.value || '') } catch { saved = null }
  const code = params.get('code')
  if (!code || !saved?.state || saved.state !== params.get('state')) return fail('google_failed')

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    })
    if (!tokenRes.ok) return fail('google_failed')
    const { access_token: accessToken } = await tokenRes.json()
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!infoRes.ok) return fail('google_failed')
    const info = await infoRes.json()
    if (!info.email || info.verified_email === false) return fail('google_failed')

    const user = await getOrCreateGoogleUser({ id: info.id || info.email, sub: info.id || info.email, email: info.email, name: info.name || info.email.split('@')[0], picture: info.picture || '' })
    await user.populate()
    const res = NextResponse.redirect(new URL(safeNext(saved.next), appUrl))
    res.cookies.set('auth-token', generateToken(user), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60, path: '/' })
    res.cookies.set(STATE_COOKIE, '', cookieOpts(0))
    return res
  } catch {
    return fail('google_failed')
  }
}
