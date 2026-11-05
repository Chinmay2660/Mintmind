import { NextResponse } from 'next/server'

// Demo Mode: no account, no database. Sets a marker cookie only; demo data lives in a
// separate browser-local database (mm-wealth-demo) and is never sent to or read from the server.
const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
}

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('mm-demo', '1', { ...cookieOpts, maxAge: 60 * 60 * 12 })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('mm-demo', '', { ...cookieOpts, maxAge: 0 })
  return res
}
