import crypto from 'crypto'

/** A family invitation lives for two minutes, whether it is used through the link or by typing the code. */
export const INVITE_TTL_MS = 2 * 60 * 1000

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

/**
 * A fresh invitation: a link token and a 6 digit code. Only fingerprints are kept, so the database never holds either one.
 * A six digit code is easy to guess in the abstract, so it is safe only because it expires in two minutes, can be tried only
 * a few times, and works only for the signed in person whose email the invitation was sent to.
 */
export function newInvite(now = Date.now()) {
  const token = crypto.randomBytes(32).toString('base64url')
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
  return { token, otp, tokenHash: sha(token), otpHash: sha(`otp:${otp}`), expiresAt: new Date(now + INVITE_TTL_MS) }
}

export const hashToken = (token) => sha(token)
export const hashOtp = (otp) => sha(`otp:${String(otp).replace(/\s/g, '')}`)
export const isOtpShape = (v) => /^\d{6}$/.test(String(v ?? '').replace(/\s/g, ''))

/** True while a pending invitation can still be accepted. */
export const inviteLive = (member, now = Date.now()) => !!member && member.status === 'invited' && !!member.inviteExpires && new Date(member.inviteExpires).getTime() > now
