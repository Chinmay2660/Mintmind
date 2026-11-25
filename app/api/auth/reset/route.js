import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { rateLimitOrRespond } from '@/lib/middleware/api'
import { hashPassword, passwordProblem } from '@/lib/passwords'
import { hashResetToken, resetTokenValid } from '@/lib/authToken'
import { invalidateUserCache } from '@/lib/auth'

export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'auth-reset', limit: 10, windowMs: 15 * 60 * 1000 })
  if (limited) return limited
  try {
    const body = await request.json().catch(() => ({}))
    const token = String(body.token || '')
    const password = String(body.password || '')
    const problem = passwordProblem(password)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
    if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'This reset link is not valid. Ask for a new one.' }, { status: 400 })

    await connectDB()
    const user = await User.findOne({ 'passwordReset.hash': hashResetToken(token) }).select('+passwordHash +passwordReset')
    if (!user || !resetTokenValid(token, user.passwordReset)) {
      return NextResponse.json({ error: 'This reset link has expired or was already used. Ask for a new one.' }, { status: 400 })
    }
    user.passwordHash = await hashPassword(password)
    user.passwordReset = undefined // one use only
    user.tokenVersion = (user.tokenVersion || 0) + 1 // every device that was signed in is signed out
    await user.save()
    invalidateUserCache(user._id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not reset the password. Please try again.' }, { status: 500 })
  }
}
