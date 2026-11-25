import { NextResponse } from 'next/server'
import { revokeToken } from '@/lib/auth'

export async function POST(request) {
  // end this sign-in on the server too, so a copied cookie stops working
  await revokeToken(request.cookies.get('auth-token')?.value)
  const res = NextResponse.json({ success: true })
  
  // Clear auth cookie
  res.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  res.cookies.set('mm-demo', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' })

  return res
}

