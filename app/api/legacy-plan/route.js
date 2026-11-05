import crypto from 'crypto'
import { featureGate } from '@/lib/features/server'
import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import LegacyConfig from '@/models/LegacyConfig'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { confirmSafe } from '@/lib/legacy/stateMachine'
import { email as sendEmail } from '@/lib/legacy/providers'

const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const KINDS = ['primary_nominee', 'secondary_nominee', 'emergency_contact', 'trusted_family']

function present(c) {
  return {
    enabled: c.enabled, inactivityDays: c.inactivityDays, reminderLeadDays: c.reminderLeadDays, confirmDays: c.confirmDays, graceDays: c.graceDays,
    channels: c.channels, state: c.state, lastActiveAt: c.lastActiveAt, confirmDeadline: c.confirmDeadline, graceEndsAt: c.graceEndsAt, releasedAt: c.releasedAt,
    contacts: c.contacts.map((x) => ({ id: x._id.toString(), name: x.name, email: x.email, mobile: x.mobile, relationship: x.relationship, kind: x.kind, priority: x.priority, accepted: x.accepted, verified: x.verified })),
    package: { notes: c.package?.notes || '', include: c.package?.include },
    vaultBundle: c.vaultBundle?.ct ? { itemCount: c.vaultBundle.itemCount, grantedContactIds: c.vaultBundle.grantedContactIds, updatedAt: c.vaultBundle.updatedAt } : null,
    accessLog: (c.accessLog || []).slice(-50).reverse(),
  }
}

async function load(userId) {
  await connectDB()
  return (await LegacyConfig.findOne({ userId })) || (await LegacyConfig.create({ userId }))
}

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'digital_legacy'); if (gate) return gate }
  return NextResponse.json({ plan: present(await load(user._id)) })
}

/** Update settings: enabled, thresholds, channels, package notes/include. */
export async function PUT(request) {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'digital_legacy'); if (gate) return gate }
  const b = await request.json()
  const c = await load(user._id)
  const num = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.round(Number(v)))) : d)
  if (typeof b.enabled === 'boolean') { c.enabled = b.enabled; if (b.enabled) Object.assign(c, confirmSafe()) }
  if (b.inactivityDays != null) c.inactivityDays = num(b.inactivityDays, 7, 730, c.inactivityDays)
  if (b.reminderLeadDays != null) c.reminderLeadDays = num(b.reminderLeadDays, 1, 60, c.reminderLeadDays)
  if (b.confirmDays != null) c.confirmDays = num(b.confirmDays, 1, 60, c.confirmDays)
  if (b.graceDays != null) c.graceDays = num(b.graceDays, 1, 90, c.graceDays)
  if (b.channels) for (const k of ['email', 'push', 'sms']) if (typeof b.channels[k] === 'boolean') c.channels[k] = b.channels[k]
  if (b.package) {
    if (typeof b.package.notes === 'string') c.package.notes = b.package.notes.slice(0, 5000)
    for (const k of ['netWorth', 'accounts', 'insurance', 'documents']) if (typeof b.package.include?.[k] === 'boolean') c.package.include[k] = b.package.include[k]
    if (b.package.snapshot) c.package.snapshot = b.package.snapshot
  }
  await c.save()
  return NextResponse.json({ plan: present(c) })
}

/** POST actions: heartbeat | confirm-safe | add-contact | remove-contact | resend-invite | save-bundle | revoke-bundle | push-subscription */
export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'legacy', limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'digital_legacy'); if (gate) return gate }
  const b = await request.json()
  const c = await load(user._id)

  switch (b.action) {
    case 'heartbeat': {
      // Activity resets the clock, unless contacts were already released (needs explicit confirm-safe)
      if (c.state !== 'released') {
        c.lastActiveAt = new Date()
        if (c.state !== 'monitoring') { Object.assign(c, confirmSafe()); c.accessLog.push({ action: 'owner_active', by: 'owner', note: 'Activity cancelled the workflow' }) }
        await c.save()
      }
      return NextResponse.json({ state: c.state })
    }
    case 'confirm-safe': {
      Object.assign(c, confirmSafe())
      c.accessLog.push({ action: 'confirm_safe', by: 'owner', note: 'Owner confirmed they are safe' })
      await c.save()
      return NextResponse.json({ plan: present(c) })
    }
    case 'add-contact': {
      const x = b.contact || {}
      const mail = String(x.email || '').trim().toLowerCase()
      if (!x.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return NextResponse.json({ error: 'Name and a valid email are required' }, { status: 400 })
      if (!KINDS.includes(x.kind)) return NextResponse.json({ error: 'Invalid contact type' }, { status: 400 })
      if (c.contacts.length >= 10) return NextResponse.json({ error: 'At most 10 contacts' }, { status: 400 })
      if (c.contacts.some((y) => y.email === mail)) return NextResponse.json({ error: 'That contact already exists' }, { status: 409 })
      const token = crypto.randomBytes(32).toString('base64url')
      c.contacts.push({ name: String(x.name).slice(0, 80), email: mail, mobile: String(x.mobile || '').slice(0, 20), relationship: String(x.relationship || '').slice(0, 40), kind: x.kind, priority: Number(x.priority) || c.contacts.length + 1, tokenHash: sha(token) })
      await c.save()
      const link = `${appUrl()}/legacy/access?token=${token}`
      const r = await sendEmail({ to: mail, subject: `${user.name || 'Someone'} named you as a trusted contact on Mintmind`, text: `${user.name || 'Someone'} would like you to be a trusted contact in their Digital Legacy plan.\n\nAccept and verify your identity: ${link}\n\nThis does not give you access to anything now. Access is only possible if the plan's inactivity checks complete and you pass additional verification.`, html: `<p>${user.name || 'Someone'} would like you to be a trusted contact in their Digital Legacy plan.</p><p><a href="${link}">Accept and verify your identity</a></p><p>This does not give you access to anything now.</p>` }).catch(() => ({ sent: false }))
      c.accessLog.push({ action: 'contact_invited', by: 'owner', note: `${x.name} <${mail}>` }); await c.save()
      return NextResponse.json({ plan: present(c), emailed: !!r.sent, inviteLink: r.sent ? undefined : link })
    }
    case 'resend-invite': {
      const x = c.contacts.id(b.contactId)
      if (!x) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const token = crypto.randomBytes(32).toString('base64url')
      x.tokenHash = sha(token); await c.save()
      const link = `${appUrl()}/legacy/access?token=${token}`
      const r = await sendEmail({ to: x.email, subject: 'Reminder: trusted contact invitation', text: `Accept and verify: ${link}`, html: `<p><a href="${link}">Accept and verify</a></p>` }).catch(() => ({ sent: false }))
      return NextResponse.json({ emailed: !!r.sent, inviteLink: r.sent ? undefined : link })
    }
    case 'remove-contact': {
      const x = c.contacts.id(b.contactId)
      if (x) { x.deleteOne(); if (c.vaultBundle?.grantedContactIds) c.vaultBundle.grantedContactIds = c.vaultBundle.grantedContactIds.filter((i) => i !== b.contactId) }
      await c.save()
      return NextResponse.json({ plan: present(c) })
    }
    case 'save-bundle': {
      // Ciphertext only. The server cannot decrypt it.
      if (!b.bundle?.ct || !b.bundle?.iv) return NextResponse.json({ error: 'Invalid bundle' }, { status: 400 })
      if (String(b.bundle.ct).length > 2_000_000) return NextResponse.json({ error: 'Bundle too large' }, { status: 413 })
      const granted = (b.grantedContactIds || []).filter((id) => c.contacts.id(id)).map(String)
      c.vaultBundle = { iv: b.bundle.iv, ct: b.bundle.ct, itemCount: Number(b.itemCount) || 0, grantedContactIds: granted, updatedAt: new Date() }
      c.accessLog.push({ action: 'vault_bundle_saved', by: 'owner', note: `${c.vaultBundle.itemCount} items for ${granted.length} contact(s)` })
      await c.save()
      return NextResponse.json({ plan: present(c) })
    }
    case 'revoke-bundle': {
      c.vaultBundle = undefined
      c.accessLog.push({ action: 'vault_bundle_revoked', by: 'owner' })
      await c.save()
      return NextResponse.json({ plan: present(c) })
    }
    case 'push-subscription': {
      c.pushSubscription = b.subscription
      await c.save()
      return NextResponse.json({ success: true })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
