import { featureGate } from '@/lib/features/server'
import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import FamilyCircle from '@/models/FamilyCircle'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { visibleSummary } from '@/lib/family/visibility'
import { decryptJson, encryptJson } from '@/lib/utils/crypto'
import { hashOtp, hashToken, inviteLive, isOtpShape, newInvite } from '@/lib/family/invite'

// A member's shared figures are kept encrypted in the database. Older plain records are still read.
const sealSummary = (obj) => ({ enc: encryptJson(obj) })
const openSummary = (s) => (s && typeof s === 'object' && s.enc ? decryptJson(s.enc) : s)

const ROLES = ['admin', 'member', 'emergency_contact']

// a code is never reused while another live invitation holds it
async function uniqueInvite() {
  for (let i = 0; i < 6; i++) {
    const inv = newInvite()
    const clash = await FamilyCircle.exists({ members: { $elemMatch: { inviteOtpHash: inv.otpHash, status: 'invited', inviteExpires: { $gt: new Date() } } } })
    if (!clash) return inv
  }
  return newInvite()
}
const PERM_KEYS = ['netWorth', 'overview', 'bank', 'mutualFunds', 'insurance', 'documents', 'emergencyOnly']
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
        summary: mine ? openSummary(m.summary) : m.status === 'active' ? visibleSummary(openSummary(m.summary), m.permissions) : null,
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
      // No email is needed: the admin gets a 6 digit code and a link, both valid for 2 minutes, and hands them over in person or in a message.
      if (!circle || !isAdmin(circle, user)) return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })
      const name = String(body.name || '').trim().slice(0, 80)
      if (!name) return NextResponse.json({ error: 'Enter their name' }, { status: 400 })
      // an invitation that anyone holding the code can use never grants admin, so a guessed code cannot take over a circle
      if (!ROLES.includes(body.role) || body.role === 'admin') return NextResponse.json({ error: 'Choose Member or Emergency Contact. Admins are promoted after they join.' }, { status: 400 })
      const inv = await uniqueInvite()
      circle.members.push({ email: '', name, relation: String(body.relation || '').slice(0, 40), role: body.role, status: 'invited', inviteTokenHash: inv.tokenHash, inviteOtpHash: inv.otpHash, inviteExpires: inv.expiresAt })
      await circle.save()
      const added = circle.members[circle.members.length - 1]
      return NextResponse.json({ circle: present(circle, user), invite: { memberId: added._id.toString(), link: `${appUrl()}/family/accept?token=${inv.token}`, otp: inv.otp, expiresAt: inv.expiresAt } })
    }
    case 'refresh-invite': {
      if (!circle || !isAdmin(circle, user)) return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })
      const m = circle.members.id(body.memberId)
      if (!m || m.status !== 'invited') return NextResponse.json({ error: 'That invitation is no longer pending' }, { status: 404 })
      const inv = await uniqueInvite()
      m.inviteTokenHash = inv.tokenHash; m.inviteOtpHash = inv.otpHash; m.inviteExpires = inv.expiresAt
      await circle.save()
      return NextResponse.json({ circle: present(circle, user), invite: { memberId: m._id.toString(), link: `${appUrl()}/family/accept?token=${inv.token}`, otp: inv.otp, expiresAt: inv.expiresAt } })
    }
    case 'accept-otp': {
      // a six digit code can be guessed, so tries are limited per person as well as per address
      const tries = rateLimitOrRespond(request, { name: `family-otp:${user._id}`, limit: 6, windowMs: 15 * 60_000 })
      if (tries) return tries
      if (!isOtpShape(body.otp)) return NextResponse.json({ error: 'Enter the 6 digit code' }, { status: 400 })
      const email = String(user.email || '').toLowerCase()
      const c = await FamilyCircle.findOne({ members: { $elemMatch: { inviteOtpHash: hashOtp(body.otp), status: 'invited' } } }).select('+members.inviteOtpHash +members.inviteTokenHash')
      // an invitation sent to a particular email still only works for that email
      const m = c?.members.find((x) => x.inviteOtpHash === hashOtp(body.otp) && x.status === 'invited' && inviteLive(x) && (!x.email || x.email === email))
      if (!m || !inviteLive(m)) return NextResponse.json({ error: 'That code is wrong or has expired. Ask for a new one.' }, { status: 410 })
      if (circle && !circle._id.equals(c._id)) return NextResponse.json({ error: 'Leave your current circle first' }, { status: 409 })
      m.userId = user._id; m.status = 'active'; m.joinedAt = new Date(); m.inviteTokenHash = undefined; m.inviteOtpHash = undefined; m.inviteExpires = undefined
      await c.save()
      return NextResponse.json({ circle: present(c, user) })
    }
    case 'accept': {
      const hash = hashToken(String(body.token || ''))
      const c = await FamilyCircle.findOne({ 'members.inviteTokenHash': hash }).select('+members.inviteTokenHash +members.inviteOtpHash')
      const m = c?.members.find((x) => x.inviteTokenHash === hash)
      if (!m || !inviteLive(m)) return NextResponse.json({ error: 'Invitation is invalid or expired' }, { status: 410 })
      if (m.email && m.email !== String(user.email || '').toLowerCase()) return NextResponse.json({ error: `This invitation was sent to a different email address.` }, { status: 403 })
      if (circle && !circle._id.equals(c._id)) return NextResponse.json({ error: 'Leave your current circle first' }, { status: 409 })
      m.userId = user._id; m.status = 'active'; m.joinedAt = new Date(); m.inviteTokenHash = undefined; m.inviteOtpHash = undefined; m.inviteExpires = undefined
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
      self.summary = sealSummary({ assets: n(s.assets), liabilities: n(s.liabilities), netWorth: n(s.netWorth), growthPct: s.growthPct == null ? null : n(s.growthPct), bank: n(s.bank), mutualFunds: n(s.mutualFunds), insuranceCover: n(s.insuranceCover), joint: Array.isArray(s.joint) ? s.joint.slice(0, 50).map((j) => ({ key: String(j.key).slice(0, 80), value: n(j.value) })) : [], updatedAt: new Date() })
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
