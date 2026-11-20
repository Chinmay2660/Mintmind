import test from 'node:test'
import assert from 'node:assert/strict'
import { applyStyle, attrsFor, normaliseStyle, BOOT_SCRIPT } from './uiStyle.js'

test('retro (Paper) is the default; clean carries no attributes, the rest carry data-style', () => {
  assert.equal(normaliseStyle(undefined), 'retro')
  assert.equal(normaliseStyle('anything'), 'retro')
  assert.equal(normaliseStyle('retro'), 'retro')
  assert.equal(normaliseStyle('clean2'), 'clean2')
  assert.equal(normaliseStyle('purple'), 'purple')
  assert.equal(normaliseStyle('graphite'), 'graphite')
  assert.equal(normaliseStyle('mono'), 'mono')
  assert.deepEqual(attrsFor('clean'), {})
  assert.deepEqual(attrsFor('clean2'), { 'data-style': 'clean2' })
  assert.deepEqual(attrsFor('purple'), { 'data-style': 'purple' })
  assert.deepEqual(attrsFor('graphite'), { 'data-style': 'graphite' })
  assert.deepEqual(attrsFor('mono'), { 'data-style': 'mono' })
  assert.deepEqual(attrsFor('retro'), { 'data-style': 'paper', 'data-retro': 'true' })
})
test('applying a style sets and removes the attributes', () => {
  const attrs = {}
  const root = { setAttribute: (k, v) => { attrs[k] = v }, removeAttribute: (k) => { delete attrs[k] } }
  applyStyle('retro', root)
  assert.deepEqual(attrs, { 'data-style': 'paper', 'data-retro': 'true' })
  applyStyle('clean2', root)
  assert.deepEqual(attrs, { 'data-style': 'clean2' })
  applyStyle('clean', root)
  assert.deepEqual(attrs, {})
})
test('the boot script knows every look except Paper, the default', () => {
  for (const v of ['clean', 'clean2', 'purple', 'graphite', 'mono', 'ocean', 'sunset', 'rose', 'forest']) assert.ok(BOOT_SCRIPT.includes(v), v)
  assert.ok(!BOOT_SCRIPT.includes('"retro"'))
})
test('every look normalises to itself', () => {
  for (const v of ['clean', 'clean2', 'purple', 'graphite', 'mono', 'ocean', 'sunset', 'rose', 'forest', 'retro']) assert.equal(normaliseStyle(v), v)
})
