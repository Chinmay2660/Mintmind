import test from 'node:test'
import assert from 'node:assert/strict'
import { isoFromMfapi, searchSchemes } from './mfapi.js'

test('mfapi dates (DD-MM-YYYY) become ISO dates, and anything else is refused', () => {
  assert.equal(isoFromMfapi('26-10-2024'), '2024-10-26')
  assert.equal(isoFromMfapi('2024-10-26'), null)
  assert.equal(isoFromMfapi(undefined), null)
})

test('a search under three letters never calls the API', async () => {
  const saved = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => [] } }
  try {
    assert.deepEqual(await searchSchemes('hd'), [])
    assert.deepEqual(await searchSchemes('  '), [])
    assert.equal(calls, 0)
  } finally { globalThis.fetch = saved }
})

test('the same search is answered from the cache, so the API is called once', async () => {
  const saved = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => [{ schemeCode: 1, schemeName: 'A Fund' }] } }
  try {
    const a = await searchSchemes('Axis Small')
    const b = await searchSchemes('axis small ')
    assert.deepEqual(a, [{ schemeCode: '1', schemeName: 'A Fund' }])
    assert.deepEqual(b, a)
    assert.equal(calls, 1)
  } finally { globalThis.fetch = saved }
})
