import test from 'node:test'
import assert from 'node:assert/strict'
import { totpAt, verifyTotp, generateSecret } from './totp.js'

// RFC 6238 vector: secret "12345678901234567890", t=59s -> 94287082 (8 digits) => last 6 = 287082
test('TOTP matches RFC 6238 vector', () => {
  assert.equal(totpAt('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59000), '287082')
})

test('verify accepts current code and rejects malformed', () => {
  const s = generateSecret()
  assert.ok(verifyTotp(s, totpAt(s)))
  assert.ok(!verifyTotp(s, 'abc123'))
})
