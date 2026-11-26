// Pure rules for when a sign-in token stops working and for password-reset tokens. Kept free of the database so they can be tested.
import crypto from 'crypto'

/**
 * A token is current when its version matches the account's, so a password change or reset ("sign out everywhere") ends every
 * older session. Tokens issued before versions existed have no `tv` and count as version 0, so nobody is signed out by the upgrade.
 */
export function isTokenCurrent(decoded, user) {
  if (!decoded || !user) return false
  return Number(decoded.tv ?? 0) === Number(user.tokenVersion ?? 0)
}

export const RESET_TTL_MS = 60 * 60 * 1000

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

/** A fresh reset token. Only the hash is stored, so a database leak does not hand out working reset links. */
export function newResetToken(now = Date.now()) {
  const token = crypto.randomBytes(32).toString('hex')
  return { token, hash: sha256(token), expiresAt: new Date(now + RESET_TTL_MS) }
}

export const hashResetToken = sha256

/** True when `token` matches the stored hash and has not expired. Constant-time compare. */
export function resetTokenValid(token, stored, now = Date.now()) {
  if (!token || !stored?.hash || !stored.expiresAt) return false
  if (new Date(stored.expiresAt).getTime() <= now) return false
  const a = Buffer.from(sha256(token), 'hex')
  const b = Buffer.from(String(stored.hash), 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * What to change on an existing account the first time Google signs in to it. Sign-up does not verify the email, so a password
 * or authentication code set before that point may belong to someone else: drop both and end every older session.
 * Returns the fields to set (empty when nothing needs to change).
 */
export function claimOnFirstGoogleLink(user) {
  if (!user || user.googleId) return {}
  if (!user.passwordHash && !user.mfa?.enabled) return {}
  return { passwordHash: undefined, mfa: undefined, tokenVersion: Number(user.tokenVersion ?? 0) + 1 }
}
