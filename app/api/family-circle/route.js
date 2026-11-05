import crypto from 'crypto'
import { featureGate } from '@/lib/features/server'
import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import FamilyCircle from '@/models/FamilyCircle'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { sendEmail } from '@/lib/email/resend'
import { visibleSummary } from '@/lib/family/visibility'

const ROLES = ['admin', 'member', 'emergency_contact']
const PERM_KEYS = ['netWorth', 'overview', 'bank', 'mutualFunds', 'insurance', 'documents', 'emergencyOnly']
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')

async function circleFor(user) {
  return FamilyCircle.findOne({ $or: [{ ownerId: user._id }, { 'members.userId': user._id }] })
}
const me = (circle, user) => circle.members.find((m) => m.userId && m.userId.equals(user._id))
const isAdmin = (circle, user) => me(circle, user)?.role === 'admin'

/** Shape returned to a viewer: owner-controlled visibility is enforced here, on the server. */
function present(circle, user) {
  const self = me(circle, user)
  return {
    id: circle._id.toString(),
    name: circle.name,
    me: self ? { id: self._id.toString(), role: self.role, permissions: self.permissions } : null,
    members: circle.members.map((m) => {
      const mine = m.userId && m.userId.equals(user._id)
      return {
        id: m._id.toString(), name: m.name, relation: m.relation, role: m.role, status: m.status, self: !!mine,
        email: mine || (self && self.role === 'admin') ? m.email : undefined,
        permissions: mine ? m.permissions : undefined,
        summary: mine ? m.summary : m.status === 'active' ? visibleSummary(m.summary, m.permissions) : null,
        invitePending: m.status === 'invited',
      }
    }),
  }
}

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'family_circle'); if (gate) return gate }
  await connectDB()
  const circle = await circleFor(user)
  return NextResponse.json({ circle: circle ? present(circle, user) : null })
}

export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'family', limit: 40, windowMs: 60_000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'family_circle'); if (gate) return gate }
  const body = await request.json()
  await connectDB()
  let circle = await circleFor(user)

  switch (body.action) {
    case 'create': {
      if (circle) return NextResponse.json({ error: 'You are already in a family circle' }, { status: 409 })
      circle = await FamilyCircle.create({
        name: String(body.name || 'My Family').slice(0, 60),
        ownerId: user._id,
        members: [{ userId: user._id, email: user.email, name: user.name || user.email, relation: 'Self', role: 'admin', status: 'active', joinedAt: new Date(), permissions: {} }],
      })
      return NextResponse.json({ circle: present(circle, user) })
    }
    case 'invite': {
      if (!circle || !isAdmin(circle, user)) return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })
      const email = String(body.email || '').trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
      if (!ROLES.includes(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      if (circle.members.some((m) => m.email === email)) return NextResponse.json({ error: 'That person is already in the circle' }, { status: 409 })
      const token = crypto.randomBytes(32).toString('base64url')
      circle.members.push({ email, name: String(body.name || email.split('@')[0]).slice(0, 80), relation: String(body.relation || '').slice(0, 40), role: body.role, status: 'invited', inviteTokenHash: sha(token), inviteExpires: new Date(Date.now() + 7 * 86400000) })
      await circle.save()
      const link = `${appUrl()}/family/accept?token=${token}`
      let emailed = false
      try {
        const r = await sendEmail({ to: email, subject: `${user.name || 'Someone'} invited you to their Family Circle on Mintmind`, text: `Accept the invitation: ${link}\n\nThe link expires in 7 days. Accepting never gives anyone access to your data; you choose what to share.`, html: `<p>${user.name || 'Someone'} invited you to join their Family Circle on Mintmind.</p><p><a href="${link}">Accept invitation</a></p><p>The link expires in 7 days. Accepting never gives anyone access to your data; you choose what to share.</p>` })
        emailed = !!r.sent
      } catch { /* fall through to link sharing */ }
      // Link is returned to the inviting admin only when email isn't configured, so they can share it themselves
      return NextResponse.json({ circle: present(circle, user), emailed, inviteLink: emailed ? undefined : link })
    }
    case 'accept': {
      const hash = sha(String(body.token || ''))
      const c = await FamilyCircle.findOne({ 'members.inviteTokenHash': hash }).select('+members.inviteTokenHash')
      const m = c?.members.find((x) => x.inviteTokenHash === hash)
      if (!m || m.status !== 'invited' || (m.inviteExpires && m.inviteExpires < new Date())) return NextResponse.json({ error: 'Invitation is invalid or expired' }, { status: 410 })
      if (m.email !== String(user.email || '').toLowerCase()) return NextResponse.json({ error: `This invitation was sent to a different email address.` }, { status: 403 })
      if (circle && !circle._id.equals(c._id)) return NextResponse.json({ error: 'Leave your current circle first' }, { status: 409 })
      m.userId = user._id; m.status = 'active'; m.joinedAt = new Date(); m.inviteTokenHash = undefined; m.inviteExpires = undefined
      await c.save()
      return NextResponse.json({ circle: present(c, user) })
    }
    case 'update-sharing': {
      const self = circle && me(circle, user)
      if (!self) return NextResponse.json({ error: 'Not in a circle' }, { status: 404 })
      for (const k of PERM_KEYS) if (typeof body.permissions?.[k] === 'boolean') self.permissions[k] = body.permissions[k]
      await circle.save()
      return NextResponse.json({ circle: present(circle, user) })
    }
    case 'summary': {
      const self = circle && me(circle, user)
      if (!self) return NextResponse.json({ error: 'Not in a circle' }, { status: 404 })
      const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
      const s = body.summary || {}
      self.summary = { assets: n(s.assets), liabilities: n(s.liabilities), netWorth: n(s.netWorth), growthPct: s.growthPct == null ? null : n(s.growthPct), bank: n(s.bank), mutualFunds: n(s.mutualFunds), insuranceCover: n(s.insuranceCover), joint: Array.isArray(s.joint) ? s.joint.slice(0, 50).map((j) => ({ key: String(j.key).slice(0, 80), value: n(j.value) })) : [], updatedAt: new Date() }
      await circle.save()
      return NextResponse.json({ success: true })
    }
    case 'update-member': {
      if (!circle || !isAdmin(circle, user)) return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
      const m = circle.members.id(body.memberId)
      if (!m || !ROLES.includes(body.role)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      if (m.role === 'admin' && body.role !== 'admin' && circle.members.filter((x) => x.role === 'admin' && x.status === 'active').length < 2) return NextResponse.json({ error: 'A circle needs at least one admin' }, { status: 409 })
      m.role = body.role
      await circle.save()
      return NextResponse.json({ circle: present(circle, user) })
    }
    case 'remove-member':
    case 'leave': {
      if (!circle) return NextResponse.json({ error: 'Not in a circle' }, { status: 404 })
      const self = me(circle, user)
      const target = body.action === 'leave' ? self : circle.members.id(body.memberId)
      if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (target !== self && !isAdmin(circle, user)) return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
      if (target.role === 'admin' && circle.members.filter((x) => x.role === 'admin' && x.status === 'active').length < 2 && circle.members.length > 1) return NextResponse.json({ error: 'Make another member an admin first' }, { status: 409 })
      target.deleteOne()
      if (circle.members.length === 0) await circle.deleteOne()
      else await circle.save()
      return NextResponse.json({ success: true })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
