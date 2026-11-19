import test from 'node:test'
import assert from 'node:assert/strict'
import { monthlyCost, nextSubscriptionDate } from './subscriptions.js'

test('monthly cost spreads quarterly and yearly bills', () => {
  assert.equal(monthlyCost({ amount: 199, frequency: 'monthly' }), 199)
  assert.equal(monthlyCost({ amount: 1200, frequency: 'yearly' }), 100)
  assert.equal(monthlyCost({ amount: 300, frequency: 'quarterly' }), 100)
})

test('next date is today or later and keeps the cycle', () => {
  const today = new Date(2026, 4, 10) // 10 May 2026
  assert.equal(nextSubscriptionDate({ startDate: '2026-01-15', frequency: 'monthly' }, today), '2026-05-15')
  assert.equal(nextSubscriptionDate({ startDate: '2026-05-10', frequency: 'monthly' }, today), '2026-05-10')
  assert.equal(nextSubscriptionDate({ startDate: '2026-01-05', frequency: 'quarterly' }, today), '2026-07-05')
  assert.equal(nextSubscriptionDate({ startDate: '2025-03-01', frequency: 'yearly' }, today), '2027-03-01')
})

test('a start date in the future is its own next date, and the 31st clamps', () => {
  assert.equal(nextSubscriptionDate({ startDate: '2026-09-01', frequency: 'monthly' }, new Date(2026, 4, 10)), '2026-09-01')
  assert.equal(nextSubscriptionDate({ startDate: '2026-01-31', frequency: 'monthly' }, new Date(2026, 1, 10)), '2026-02-28')
  assert.equal(nextSubscriptionDate({ frequency: 'monthly' }), null)
})
