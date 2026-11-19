import test from 'node:test'
import assert from 'node:assert/strict'
import { safeNext, googleSignInConfig } from './signin.js'

test('only same-site paths are followed after sign-in', () => {
  assert.equal(safeNext('/dashboard/budget?add=1'), '/dashboard/budget?add=1')
  assert.equal(safeNext('//evil.example'), '/dashboard')
  assert.equal(safeNext('https://evil.example'), '/dashboard')
  assert.equal(safeNext('/\\evil.example'), '/dashboard')
  assert.equal(safeNext(undefined), '/dashboard')
  assert.equal(safeNext(null), '/dashboard')
})

test('redirect sign-in needs both the client id and the secret', () => {
  const req = { url: 'https://app.example/api/auth/google/redirect' }
  const keep = { ...process.env }
  delete process.env.GOOGLE_CLIENT_ID; delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET; delete process.env.APP_URL
  assert.equal(googleSignInConfig(req).configured, false)
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'id'
  assert.equal(googleSignInConfig(req).configured, false)
  process.env.GOOGLE_CLIENT_SECRET = 's'
  const c = googleSignInConfig(req)
  assert.equal(c.configured, true)
  assert.equal(c.redirectUri, 'https://app.example/api/auth/google/callback')
  Object.assign(process.env, keep)
})
