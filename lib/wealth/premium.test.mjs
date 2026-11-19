import test from 'node:test'
import assert from 'node:assert/strict'
import { premiumPayable } from './premium.js'

const today = new Date(2026, 10, 20) // 20 Nov 2026
const p = (frequency, nextPremium, extra = {}) => ({ frequency, nextPremium, ...extra })

test('a premium paid for this period cannot be marked again', () => {
  assert.equal(premiumPayable(p('yearly', '2027-11-20'), today).ok, false) // just paid: due in a year
  assert.equal(premiumPayable(p('monthly', '2026-12-20'), today).ok, false)
  assert.equal(premiumPayable(p('quarterly', '2027-02-20'), today).ok, false)
  assert.match(premiumPayable(p('yearly', '2027-11-20'), today).reason, /Already paid/)
})
test('it opens shortly before the due date, and stays open when overdue', () => {
  assert.equal(premiumPayable(p('yearly', '2026-12-30'), today).ok, true) // 40 days away, inside the 45 day window
  assert.equal(premiumPayable(p('monthly', '2026-11-28'), today).ok, true)
  assert.equal(premiumPayable(p('monthly', '2026-12-05'), today).ok, false) // 15 days away, outside the 10 day window
  assert.equal(premiumPayable(p('half_yearly', '2026-11-01'), today).ok, true) // overdue
  assert.equal(premiumPayable(p('yearly', '2026-11-20'), today).ok, true) // due today
})
test('single premium, ended and undated policies are not payable', () => {
  assert.equal(premiumPayable(p('single', '2026-11-20'), today).ok, false)
  assert.equal(premiumPayable(p('yearly', '2026-11-25', { endDate: '2026-10-01' }), today).ok, false)
  assert.equal(premiumPayable(p('yearly', ''), today).ok, false)
  assert.equal(premiumPayable(null, today).ok, false)
})
test('the window shows when it opens', () => {
  assert.equal(premiumPayable(p('yearly', '2027-11-20'), today).opensOn, '2027-10-06')
})
