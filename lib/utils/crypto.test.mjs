import test from 'node:test'
import assert from 'node:assert/strict'
import { decrypt, decryptJson, encrypt, encryptJson, getKey, hashToken } from './crypto.js'

test('round trip, and the ciphertext is not the text', () => {
  const c = encrypt('salary 1,20,000')
  assert.ok(!c.includes('salary'))
  assert.equal(decrypt(c), 'salary 1,20,000')
  assert.notEqual(encrypt('x'), encrypt('x')) // a fresh random value each time
})
test('objects round trip and tampering gives null', () => {
  const c = encryptJson({ netWorth: 5 })
  assert.deepEqual(decryptJson(c), { netWorth: 5 })
  assert.equal(decryptJson(c.slice(0, -2) + '00'), null)
})
test('production refuses a missing or short key', () => {
  assert.throws(() => getKey({ NODE_ENV: 'production' }), /must be set/)
  assert.throws(() => getKey({ NODE_ENV: 'production', ENCRYPTION_KEY: 'short' }), /at least 32/)
  assert.ok(getKey({ NODE_ENV: 'production', ENCRYPTION_KEY: 'x'.repeat(32) }))
  assert.ok(getKey({ NODE_ENV: 'development' }))
})
test('token hashes are stable and hide the token', () => {
  assert.equal(hashToken('abc'), hashToken('abc'))
  assert.ok(!hashToken('abc').includes('abc'))
  assert.equal(hashToken('abc').length, 64)
})
