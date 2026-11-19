import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDate } from './format.js'

test('a placeholder or empty date shows a dash, never a 1899 date', () => {
  assert.equal(formatDate('0000-00-00'), '-')
  assert.equal(formatDate(''), '-')
  assert.equal(formatDate(null), '-')
  assert.equal(formatDate('not a date'), '-')
})
test('a real date still formats', () => {
  assert.equal(formatDate('2026-11-20', 'DD MMM YYYY'), '20 Nov 2026')
  assert.equal(formatDate('2026-11-20', 'YYYY-MM-DD'), '2026-11-20')
})
