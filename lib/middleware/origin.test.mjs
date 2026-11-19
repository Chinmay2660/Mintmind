import test from 'node:test'
import assert from 'node:assert/strict'
import { isForgedOrigin } from './origin.js'

test('safe methods are never refused', () => assert.equal(isForgedOrigin('GET', 'https://evil.example', 'app.example'), false))
test('same site writes pass', () => assert.equal(isForgedOrigin('POST', 'https://app.example', 'app.example'), false))
test('cross site writes are refused', () => {
  assert.equal(isForgedOrigin('POST', 'https://evil.example', 'app.example'), true)
  assert.equal(isForgedOrigin('DELETE', 'https://app.example.evil.example', 'app.example'), true)
})
test('opaque and malformed origins are refused', () => {
  assert.equal(isForgedOrigin('PUT', 'null', 'app.example'), true)
  assert.equal(isForgedOrigin('PATCH', 'not a url', 'app.example'), true)
})
test('no Origin means not a browser forgery', () => assert.equal(isForgedOrigin('POST', null, 'app.example'), false))
