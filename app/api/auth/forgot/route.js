import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { rateLimitOrRespond } from '@/lib/middleware/api'
import { checkRateLimit } from '@/lib/middleware/rateLimit'
import { newResetToken } from '@/lib/authToken'
import { sendEmail } from '@/lib/email/resend'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// The answer never says whether the address has an account, so this cannot be used to find out who is registered.
const SAME_ANSWER = { success: true, message: 'If that email has a Mintmind account, we have sent a link to reset the password. It works for one hour.' }

export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'auth-forgot', limit: 5, windowMs: 15 * 60 * 1000 })
  if (limited) return limited
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    if (!EMAIL.test(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    // at most 3 emails per address an hour, however many networks the requests come from
    if (checkRateLimit(`forgot:${email}`, { limit: 3, windowMs: 60 * 60 * 1000 }).limited) return NextResponse.json(SAME_ANSWER)

    await connectDB()
    const user = await User.findOne({ email }).select('+passwordHash')
    // Google-only accounts have no password to reset
    if (user?.passwordHash) {
      const { token, hash, expiresAt } = newResetToken()
      user.passwordReset = { hash, expiresAt }
      await user.save()
      const base = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, '')
      const link = `${base}/auth/reset?token=${token}`
      try {
        const r = await sendEmail({
          to: email,
          subject: 'Reset your Mintmind password',
          text: `Someone asked to reset the password for this Mintmind account. Open this link within one hour to choose a new one:\n\n${link}\n\nIf this was not you, ignore this email. Your password stays the same.`,
          html: `<p>Someone asked to reset the password for this Mintmind account.</p><p><a href="${link}">Choose a new password</a> (the link works for one hour).</p><p>If this was not you, ignore this email. Your password stays the same.</p>`,
        })
        // with no email service set up, the link is shown in the server log in development only, never in a response and never in production
        if (!r.sent && process.env.NODE_ENV !== 'production') console.log(`[dev] password reset link for ${email}: ${link}`)
      } catch { /* the same answer either way */ }
    }
    return NextResponse.json(SAME_ANSWER)
  } catch {
    return NextResponse.json({ error: 'Could not start the reset. Please try again.' }, { status: 500 })
  }
}
