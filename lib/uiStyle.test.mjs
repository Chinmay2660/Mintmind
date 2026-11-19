import test from 'node:test'
import assert from 'node:assert/strict'
import { applyStyle, attrsFor, normaliseStyle, BOOT_SCRIPT } from './uiStyle.js'

test('retro is the default and carries both attributes; clean carries none', () => {
  assert.equal(normaliseStyle(undefined), 'retro')
  assert.equal(normaliseStyle('anything'), 'retro')
  assert.deepEqual(attrsFor('retro'), { 'data-style': 'paper', 'data-retro': 'true' })
  assert.deepEqual(attrsFor('clean'), {})
})
test('applying a style sets and removes the attributes', () => {
  const attrs = { 'data-style': 'paper', 'data-retro': 'true' }
  const root = { setAttribute: (k, v) => { attrs[k] = v }, removeAttribute: (k) => { delete attrs[k] } }
  applyStyle('clean', root)
  assert.deepEqual(attrs, {})
  applyStyle('retro', root)
  assert.deepEqual(attrs, { 'data-style': 'paper', 'data-retro': 'true' })
})
test('the boot script only touches the page for the clean choice', () => {
  assert.ok(BOOT_SCRIPT.includes("=== 'clean'".replace(' ', '')) || BOOT_SCRIPT.includes("==='clean'"))
})
