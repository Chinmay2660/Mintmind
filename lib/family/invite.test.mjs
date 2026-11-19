import test from 'node:test'
import assert from 'node:assert/strict'
import { INVITE_TTL_MS, hashOtp, hashToken, inviteLive, isOtpShape, newInvite } from './invite.js'

test('an invitation lasts exactly two minutes and has a six digit code', () => {
  const now = 1_700_000_000_000
  const i = newInvite(now)
  assert.equal(INVITE_TTL_MS, 120000)
  assert.equal(i.expiresAt.getTime(), now + 120000)
  assert.match(i.otp, /^\d{6}$/)
  assert.ok(i.token.length >= 40)
})
test('only fingerprints are stored, and they match when the code or link is presented', () => {
  const i = newInvite()
  assert.equal(i.otpHash, hashOtp(i.otp))
  assert.equal(i.otpHash, hashOtp(`${i.otp.slice(0, 3)} ${i.otp.slice(3)}`)) // spaces are ignored
  assert.equal(i.tokenHash, hashToken(i.token))
  assert.ok(!i.otpHash.includes(i.otp) && !i.tokenHash.includes(i.token))
  assert.notEqual(hashOtp('123456'), hashToken('123456')) // a code can never be used as a link token
})
test('codes are not all the same, and keep leading zeros', () => {
  const codes = new Set(Array.from({ length: 40 }, () => newInvite().otp))
  assert.ok(codes.size > 30)
  assert.ok([...codes].every((c) => c.length === 6))
})
test('code shape check', () => {
  assert.equal(isOtpShape('123456'), true)
  assert.equal(isOtpShape('123 456'), true)
  for (const bad of ['12345', '1234567', 'abcdef', '', null, '12 34 5x']) assert.equal(isOtpShape(bad), false, String(bad))
})
test('an invitation is live only while pending and before it expires', () => {
  const now = 1000
  assert.equal(inviteLive({ status: 'invited', inviteExpires: new Date(now + 1) }, now), true)
  assert.equal(inviteLive({ status: 'invited', inviteExpires: new Date(now) }, now), false)
  assert.equal(inviteLive({ status: 'active', inviteExpires: new Date(now + 1000) }, now), false)
  assert.equal(inviteLive({ status: 'invited' }, now), false)
  assert.equal(inviteLive(null, now), false)
})
