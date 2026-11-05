import test from 'node:test'
import assert from 'node:assert/strict'
import { FEATURES, PACKAGES, normaliseSelection, recommendedFor, featureForPath, validateAge, suggestFeatures, isFeatureEnabled } from './features.js'

test('dashboard is always on and selections are normalised', () => {
  assert.deepEqual(normaliseSelection(['bank_accounts', 'bogus']), ['dashboard', 'bank_accounts'])
  assert.deepEqual(normaliseSelection([]), ['dashboard'])
  assert.equal(isFeatureEnabled(new Set(), 'dashboard'), true)
  assert.equal(isFeatureEnabled(new Set(), 'vault'), false)
})

test('packages only reference real features and include the core one', () => {
  for (const p of PACKAGES) { assert.ok(p.features.includes('dashboard')); for (const k of p.features) assert.ok(FEATURES.some((f) => f.key === k), k) }
  assert.equal(PACKAGES.find((p) => p.key === 'complete').features.length, FEATURES.length)
  assert.ok(!PACKAGES.find((p) => p.key === 'basic').features.includes('vault'))
})

test('goals only recommend; routes map to features', () => {
  assert.deepEqual(recommendedFor(['funds', 'budget']).sort(), ['budget_expenses', 'mutual_funds'])
  assert.equal(featureForPath('/dashboard/mutual-funds/abc'), 'mutual_funds')
  assert.equal(featureForPath('/dashboard/settings'), null)
  assert.equal(featureForPath('/dashboard/net-worth'), 'dashboard')
  assert.equal(featureForPath('/dashboard/ai'), 'ai_assistant')
})

test('age is optional but validated', () => {
  assert.deepEqual(validateAge(''), { ok: true, value: null })
  assert.equal(validateAge('17').ok, false)
  assert.equal(validateAge('121').ok, false)
  assert.equal(validateAge('34.5').ok, false)
  assert.deepEqual(validateAge('34'), { ok: true, value: 34 })
})

test('suggestions explain themselves and never include enabled features', () => {
  const s = suggestFeatures(new Set(['dashboard', 'bank_accounts', 'family_circle']), { banks: 2, funds: 0, policies: 0, cards: 0 })
  assert.ok(s.every((x) => x.reason.length > 20))
  assert.ok(s.some((x) => x.key === 'budget_expenses'))
  assert.ok(s.some((x) => x.key === 'digital_legacy'))
  assert.ok(!s.some((x) => x.key === 'bank_accounts'))
})
