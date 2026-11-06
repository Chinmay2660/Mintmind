import { NextResponse } from 'next/server'
import { createSession } from '@/lib/kite/client'
import { saveAppSession } from '@/lib/market/session'

/** Internal. Zerodha redirects here after the owner signs in; stores the app-level session (valid until ~6 AM IST next day). */
export async function GET(request) {
  const url = new URL(request.url)
  const requestToken = url.searchParams.get('request_token')
  const state = url.searchParams.get('state')
  const expected = request.cookies.get('kite-oauth-state')?.value
  const text = (msg, status = 200) => { const r = new NextResponse(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }); r.cookies.set('kite-oauth-state', '', { path: '/api/internal/kite', maxAge: 0 }); return r }
  if (url.searchParams.get('status') !== 'success' || !requestToken) return text('Zerodha sign-in was cancelled.', 400)
  if (!state || !expected || state !== expected) return text('Invalid sign-in state. Start again from the login link.', 400)
  try { await saveAppSession(await createSession(requestToken)); return text('Zerodha connected for the weekly price sync. You can close this tab.') } catch { return text('Could not complete Zerodha sign-in.', 502) }
}
