import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'
import { hashPassword, passwordProblem } from '@/lib/passwords'
import { rateLimitOrRespond } from '@/lib/middleware/api'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'auth-register', limit: 5, windowMs: 15 * 60 * 1000 })
  if (limited) return limited
  try {
    const body = await request.json()
    const name = String(body.name || '').trim().slice(0, 80)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!EMAIL.test(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    const problem = passwordProblem(password)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })

    await connectDB()
    const existing = await User.findOne({ email })
    // Same response whether or not the email exists would need email verification; keep explicit message for usability.
    if (existing) return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 409 })

    const [firstName, ...rest] = name.split(' ')
    const user = await User.create({ email, name, firstName, lastName: rest.join(' '), passwordHash: await hashPassword(password) })
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
    return NextResponse.json({ error: 'Could not create account' }, { status: 500 })
  }
}
