import test from 'node:test'
import assert from 'node:assert/strict'
import { isRetiredApi } from './legacyApi.js'

test('old plain-data routes are off, including their sub paths', () => {
  assert.equal(isRetiredApi('/api/bank-accounts', {}), true)
  assert.equal(isRetiredApi('/api/transactions/123', {}), true)
  assert.equal(isRetiredApi('/api/passwords', {}), true)
})
test('routes the app uses stay on, and similar names are not caught', () => {
  for (const p of ['/api/auth/login', '/api/drive/files/1', '/api/family-circle', '/api/features', '/api/legacy-plan', '/api/ai/chat', '/api/internal/market-sync']) assert.equal(isRetiredApi(p, {}), false, p)
})
test('an explicit switch turns them back on', () => assert.equal(isRetiredApi('/api/loans', { ALLOW_LEGACY_API: '1' }), false))
