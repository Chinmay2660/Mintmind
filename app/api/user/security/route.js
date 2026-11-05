import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/passwords'
import { generateSecret, otpauthUrl, verifyTotp } from '@/lib/totp'
import { decrypt, encrypt } from '@/lib/utils/crypto'
import { invalidateUserCache } from '@/lib/auth'

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response
  await connectDB()
  const u = await User.findById(user._id).select('+passwordHash')
  return NextResponse.json({ hasPassword: !!u.passwordHash, mfaEnabled: !!u.mfa?.enabled, email: u.email })
}

/** POST { action: 'setup-mfa' | 'enable-mfa' | 'disable-mfa' | 'change-password', ... } */
export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'user-security', limit: 15, windowMs: 15 * 60 * 1000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  const body = await request.json()
  await connectDB()
  const u = await User.findById(user._id).select('+passwordHash +mfa.secretEnc +mfa.pendingSecretEnc')

  switch (body.action) {
    case 'setup-mfa': {
      const secret = generateSecret()
      u.mfa = { ...(u.mfa?.toObject?.() ?? {}), pendingSecretEnc: encrypt(secret), enabled: !!u.mfa?.enabled, secretEnc: u.mfa?.secretEnc }
      await u.save()
      return NextResponse.json({ secret, otpauthUrl: otpauthUrl(secret, u.email || 'account') })
    }
    case 'enable-mfa': {
      if (!u.mfa?.pendingSecretEnc) return NextResponse.json({ error: 'Start setup first' }, { status: 400 })
      const secret = decrypt(u.mfa.pendingSecretEnc)
      if (!verifyTotp(secret, body.code)) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
      u.mfa = { enabled: true, secretEnc: u.mfa.pendingSecretEnc, pendingSecretEnc: undefined }
      await u.save()
      return NextResponse.json({ success: true })
    }
    case 'disable-mfa': {
      if (u.passwordHash && !(await verifyPassword(String(body.password || ''), u.passwordHash))) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }
      if (u.mfa?.enabled && !verifyTotp(decrypt(u.mfa.secretEnc), body.code)) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
      }
      u.mfa = { enabled: false }
      await u.save()
      return NextResponse.json({ success: true })
    }
    case 'change-password': {
      if (u.passwordHash && !(await verifyPassword(String(body.currentPassword || ''), u.passwordHash))) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
      }
      const problem = passwordProblem(body.newPassword)
      if (problem) return NextResponse.json({ error: problem }, { status: 400 })
      u.passwordHash = await hashPassword(body.newPassword)
      await u.save()
      invalidateUserCache(u._id)
      return NextResponse.json({ success: true })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
