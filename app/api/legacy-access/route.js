import crypto from 'crypto'
import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import LegacyConfig from '@/models/LegacyConfig'
import User from '@/models/User'
import { rateLimitOrRespond } from '@/lib/middleware/api'
import { email, sendSms } from '@/lib/legacy/providers'

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

/**
 * Public endpoint for trusted contacts (token from their email link).
 *   info          -> who invited me, what stage the plan is in (no data)
 *   send-code     -> OTP by email (and SMS if the owner enabled it and a provider is configured)
 *   verify        -> OTP check. Before release: marks invitation accepted + identity verified.
 *                    After release: returns the owner's prepared information package and, if explicitly
 *                    granted to this contact, the encrypted vault bundle (still needs the Emergency Access Key).
 */
export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'legacy-access', limit: 20, windowMs: 15 * 60 * 1000 })
  if (limited) return limited
  const { action, token, code } = await request.json()
  if (!token || typeof token !== 'string') return NextResponse.json({ error: 'Invalid link' }, { status: 400 })
  await connectDB()
  const plan = await LegacyConfig.findOne({ 'contacts.tokenHash': sha(token) }).select('+contacts.tokenHash +contacts.otpHash')
  const contact = plan?.contacts.find((c) => c.tokenHash === sha(token))
  if (!plan || !contact) return NextResponse.json({ error: 'This link is invalid or has been replaced.' }, { status: 404 })
  const owner = await User.findById(plan.userId)
  const ownerName = owner?.name || 'the account owner'

  if (action === 'info') {
    return NextResponse.json({ ownerName, contactName: contact.name, accepted: contact.accepted, verified: contact.verified, state: plan.state, graceEndsAt: plan.state === 'contacts_notified' ? plan.graceEndsAt : null, smsAvailable: !!(plan.channels.sms && contact.mobile && process.env.SMS_PROVIDER) })
  }

  if (action === 'send-code') {
    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    contact.otpHash = sha(`${otp}:${token}`); contact.otpExpires = new Date(Date.now() + 10 * 60_000); contact.otpAttempts = 0
    await plan.save()
    const r = await email({ to: contact.email, subject: 'Your Mintmind verification code', text: `Your verification code is ${otp}. It expires in 10 minutes. If you did not request it, ignore this message.`, html: `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>` }).catch(() => ({ sent: false }))
    let smsSent = false
    if (plan.channels.sms && contact.mobile) smsSent = !!(await sendSms({ to: contact.mobile, body: `Mintmind verification code: ${otp}` })).sent
    // In non-production without an email provider, surface the code so the flow can be tested locally
    const dev = process.env.NODE_ENV !== 'production' && !r.sent && !smsSent
    return NextResponse.json({ sent: !!(r.sent || smsSent), emailSent: !!r.sent, smsSent, devCode: dev ? otp : undefined })
  }

  if (action === 'verify') {
    if (!contact.otpHash || !contact.otpExpires || contact.otpExpires < new Date()) return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 410 })
    if (contact.otpAttempts >= 5) return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 })
    contact.otpAttempts += 1
    const given = sha(`${String(code || '').trim()}:${token}`)
    const ok = given.length === contact.otpHash.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(contact.otpHash))
    if (!ok) { await plan.save(); return NextResponse.json({ error: 'Incorrect code' }, { status: 401 }) }
    contact.otpHash = undefined; contact.otpExpires = undefined
    if (!contact.accepted) { contact.accepted = true; contact.verified = true; plan.accessLog.push({ action: 'contact_accepted', by: contact.name, note: 'Identity verified by one-time code' }) }
    if (plan.state !== 'released') { await plan.save(); return NextResponse.json({ accepted: true, released: false, state: plan.state }) }

    plan.accessLog.push({ action: 'access_granted', by: contact.name, note: 'Verified after grace period' })
    await plan.save()
    const granted = plan.vaultBundle?.ct && plan.vaultBundle.grantedContactIds?.includes(contact._id.toString())
    return NextResponse.json({
      accepted: true, released: true, ownerName,
      package: { notes: plan.package?.notes || '', include: plan.package?.include, snapshot: plan.package?.snapshot },
      vaultBundle: granted ? { iv: plan.vaultBundle.iv, ct: plan.vaultBundle.ct, itemCount: plan.vaultBundle.itemCount } : null,
    })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
