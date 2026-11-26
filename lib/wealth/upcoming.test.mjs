import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUpcoming, dayLabel, dueGroup } from './upcoming.js'

const today = new Date('2026-11-26T09:00:00')

test('a due date reads as Today, Tomorrow, a short date, or a dated year when it is not this year', () => {
  assert.equal(dayLabel('2026-11-26', today), 'Today')
  assert.equal(dayLabel('2026-11-27', today), 'Tomorrow')
  assert.equal(dayLabel('2026-11-28', today), '28 Nov')
  assert.equal(dayLabel('2027-01-05', today), '5 Jan 2027')
  assert.equal(dayLabel('2026-11-20', today), 'Overdue')
  assert.equal(dayLabel('', today), '')
})

test('the full list is grouped by how soon each is due', () => {
  assert.equal(dueGroup('2026-11-20', today), 'Overdue')
  assert.equal(dueGroup('2026-11-26', today), 'Today')
  assert.equal(dueGroup('2026-12-03', today), 'Next 7 days')
  assert.equal(dueGroup('2026-11-30', today), 'Next 7 days')
  assert.equal(dueGroup('2026-12-20', today), 'Later')
})

test('each upcoming item opens its own card, policy or fund, and the list is soonest first', () => {
  const list = buildUpcoming({
    today,
    cards: [{ id: 'c1', bank: 'HDFC', cardName: 'Regalia', outstanding: 45000, dueDay: 2 }],
    policies: [{ id: 'p1', company: 'LIC', policyName: 'Jeevan', premium: 10000, nextPremium: '2026-12-10' }],
    sips: [{ id: 's1', fundId: 'f1', amount: 5000, frequency: 'monthly', debitDay: 5, startDate: '2026-01-05', status: 'active' }],
    funds: [{ id: 'f1', name: 'Axis Small Cap' }],
    subs: [{ id: 'u1', name: 'Netflix', amount: 649, frequency: 'monthly', startDate: '2026-01-28' }],
  })
  assert.deepEqual(list.map((x) => x.kind), ['recurring', 'card', 'sip', 'premium'])
  const by = Object.fromEntries(list.map((x) => [x.kind, x.href]))
  assert.equal(by.card, '/dashboard/credit-cards?card=c1')
  assert.equal(by.premium, '/dashboard/insurance?policy=p1')
  assert.equal(by.sip, '/dashboard/mutual-funds/f1')
  assert.equal(by.recurring, '/dashboard/budget?tab=recurring')
  assert.deepEqual(buildUpcoming({ today }), [])
})
