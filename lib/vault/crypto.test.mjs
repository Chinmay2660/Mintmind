import test from 'node:test'
import assert from 'node:assert/strict'
import { createVault, unlockVault, recoverVault, encryptJson, decryptJson, generatePassword, passwordStrength, createEmergencyBundle, openEmergencyBundle } from './crypto.js'

test('vault round trip: wrong password fails, right password decrypts', async () => {
  const { meta, key } = await createVault('correct horse battery staple 9!')
  const blob = await encryptJson(key, { password: 's3cret' })
  assert.ok(!JSON.stringify(blob).includes('s3cret'))
  assert.equal(await unlockVault(meta, 'wrong password'), null)
  const u = await unlockVault(meta, 'correct horse battery staple 9!')
  assert.deepEqual(await decryptJson(u.key, blob), { password: 's3cret' })
})

test('recovery key unwraps the same master key and rejects a wrong key', async () => {
  const { meta, key, recoveryKey } = await createVault('Initial#Pass1234')
  const blob = await encryptJson(key, { a: 1 })
  assert.equal(await recoverVault(meta, 'AAAAAA-BBBBBB-CCCCCC-DDDDDD', 'x'), null)
  const r = await recoverVault(meta, recoveryKey, 'NewPassword#5678')
  assert.deepEqual(await decryptJson(r.oldKey, blob), { a: 1 })
})

test('generator honours length and classes; strength meter orders sensibly', () => {
  const p = generatePassword({ length: 24 })
  assert.equal(p.length, 24)
  assert.ok(/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p))
  assert.equal(generatePassword({ length: 12, symbols: false, digits: false, upper: false }).match(/^[a-z]+$/) !== null, true)
  assert.ok(passwordStrength('password123').score < passwordStrength(p).score)
  assert.equal(passwordStrength(p).score, 4)
})

test('emergency bundle opens only with its access key', async () => {
  const { bundle, accessKey } = await createEmergencyBundle([{ name: 'Bank', password: 'x' }])
  assert.deepEqual(await openEmergencyBundle(bundle, accessKey), [{ name: 'Bank', password: 'x' }])
  await assert.rejects(() => openEmergencyBundle(bundle, 'AAAAAA-BBBBBB-CCCCCC-DDDDDD'))
})
