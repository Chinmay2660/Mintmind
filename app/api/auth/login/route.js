import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'
import { verifyPassword, hashPassword } from '@/lib/passwords'
import { verifyTotp } from '@/lib/totp'
import { decrypt } from '@/lib/utils/crypto'
import { rateLimitOrRespond } from '@/lib/middleware/api'
import { checkRateLimit } from '@/lib/middleware/rateLimit'

// A fixed dummy hash keeps response time similar for unknown emails (no user enumeration by timing).
const DUMMY_PROMISE = hashPassword('not-a-real-password')

export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'auth-login', limit: 10, windowMs: 15 * 60 * 1000 })
  if (limited) return limited
  try {
    const { email: rawEmail, password, totp } = await request.json()
    const email = String(rawEmail || '').trim().toLowerCase()
    // Per-account throttle so distributed guessing against one account is slowed too
    const acct = checkRateLimit(`login-acct:${email}`, { limit: 8, windowMs: 15 * 60 * 1000 })
    if (acct.limited) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })

    await connectDB()
    const user = await User.findOne({ email }).select('+passwordHash +mfa.secretEnc')
    const ok = (await verifyPassword(String(password || ''), user?.passwordHash || (await DUMMY_PROMISE))) && !!user?.passwordHash
    if (!ok) return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })

    if (user.mfa?.enabled) {
      if (!totp) return NextResponse.json({ mfaRequired: true })
      if (!verifyTotp(decrypt(user.mfa.secretEnc), totp)) {
        return NextResponse.json({ mfaRequired: true, error: 'Invalid authentication code' }, { status: 401 })
      }
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('auth-token', generateToken(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 500 })
  }
}
