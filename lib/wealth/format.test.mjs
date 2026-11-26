import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatINR } from './format.js'

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
test('amounts show up to 2 decimal places exactly as entered', () => {
  assert.equal(formatINR(1200).replace(/s/g, ''), '₹1,200')
  assert.equal(formatINR(1200.5).replace(/s/g, ''), '₹1,200.50')
  assert.equal(formatINR(1200.55).replace(/s/g, ''), '₹1,200.55')
  assert.equal(formatINR(-34828.5).replace(/s/g, ''), '-₹34,828.50')
  assert.equal(formatINR(1200, { decimals: true }).replace(/s/g, ''), '₹1,200.00')
  assert.equal(formatINR(1234567.891).replace(/s/g, ''), '₹12,34,567.89')
})

import { timeLeft } from './format.js'
test('timeLeft reads as years, months and days', () => {
  assert.equal(timeLeft(new Date(2026, 10, 26), '2027-09-26'), '10 months')
  assert.equal(timeLeft(new Date(2026, 10, 26), '2028-01-31'), '1 year 2 months 5 days')
  assert.equal(timeLeft(new Date(2026, 10, 26), '2026-12-27'), '1 month 1 day')
  assert.equal(timeLeft(new Date(2026, 10, 26), '2026-11-26'), '0 days')
  assert.equal(timeLeft(new Date(2026, 10, 26), '2026-10-01'), '0 days')
})
