import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import { driveConfig, exchangeCode, saveConnection, DRIVE_SCOPE } from '@/lib/google/drive'

export async function GET(request) {
  const { appUrl } = driveConfig()
  const back = (q) => {
    const res = NextResponse.redirect(`${appUrl}/dashboard/settings?${q}`)
    res.cookies.set('drive-oauth-state', '', { path: '/api/drive', maxAge: 0 })
    return res
  }
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expected = request.cookies.get('drive-oauth-state')?.value
  if (url.searchParams.get('error')) return back('drive=denied')
  if (!code || !state || !expected || state !== expected) return back('drive=invalid_state')

  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.redirect(`${appUrl}/auth/signin`)

  const { ok, json } = await exchangeCode(code)
  if (!ok || !json.refresh_token) return back('drive=failed')
  if (!String(json.scope || '').includes(DRIVE_SCOPE)) return back('drive=scope')

  let email
  try {
    email = JSON.parse(Buffer.from(String(json.id_token).split('.')[1], 'base64url').toString()).email
  } catch {
    /* optional */
  }
  await connectDB()
  await saveConnection(user._id, { refreshToken: json.refresh_token, scope: json.scope, email })
  return back('drive=connected')
}
