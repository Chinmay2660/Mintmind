import test from 'node:test'
import assert from 'node:assert/strict'
import { isTokenCurrent, newResetToken, resetTokenValid, hashResetToken, RESET_TTL_MS } from './authToken.js'

test('a token ends when the account version moves on; old tokens without a version still work until then', () => {
  assert.equal(isTokenCurrent({ id: 'u' }, { tokenVersion: 0 }), true)
  assert.equal(isTokenCurrent({ id: 'u' }, {}), true)
  assert.equal(isTokenCurrent({ id: 'u', tv: 2 }, { tokenVersion: 2 }), true)
  assert.equal(isTokenCurrent({ id: 'u', tv: 1 }, { tokenVersion: 2 }), false)
  assert.equal(isTokenCurrent({ id: 'u' }, { tokenVersion: 1 }), false)
  assert.equal(isTokenCurrent(null, { tokenVersion: 0 }), false)
})

test('a reset token works once within its hour, never expired, never altered, and only the hash is kept', () => {
  const now = Date.now()
  const { token, hash, expiresAt } = newResetToken(now)
  assert.notEqual(token, hash)
  assert.equal(expiresAt.getTime() - now, RESET_TTL_MS)
  const stored = { hash, expiresAt }
  assert.equal(resetTokenValid(token, stored, now + 1000), true)
  assert.equal(resetTokenValid(token, stored, now + RESET_TTL_MS + 1), false)
  assert.equal(resetTokenValid(token + 'x', stored, now + 1000), false)
  assert.equal(resetTokenValid('', stored, now), false)
  assert.equal(resetTokenValid(token, null, now), false)
  assert.equal(hashResetToken(token), hash)
})
