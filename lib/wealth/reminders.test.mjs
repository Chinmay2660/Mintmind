import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNotifications } from './reminders.js'

const today = new Date(2026, 5, 10) // 10 Jun 2026

test('no data gives only the set-a-budget nudge, nothing fabricated', () => {
  const n = buildNotifications({}, today)
  assert.deepEqual(n.map((x) => x.kind), ['nobudget'])
})

test('reminders across modules carry module names and severity', () => {
  const n = buildNotifications({
    cards: [{ id: 'c', bank: 'HDFC', cardName: 'Regalia', limit: 100000, outstanding: 95000, dueDay: 12, statementDay: 11 }],
    policies: [{ id: 'p', company: 'Star', policyName: 'Health', nextPremium: '2026-06-15', premium: 1000, frequency: 'yearly' }],
    bankAccounts: [{ id: 'b', bankName: 'SBI', type: 'savings', currentBalance: 4000, mab: 10000 }],
    funds: [{ id: 'f', name: 'X', navDate: '2026-05-01', navSource: 'manual' }],
    budgets: [{ id: '2026-06', total: 1000, categories: { Food: 100 } }],
    expenses: [{ date: '2026-06-02', amount: 950, category: 'Food' }],
    assets: [{ id: 'a', updated: '2026-01-01' }],
    members: [{ id: 'm', name: 'Sunita', status: 'pending' }],
  }, today)
  const kinds = new Set(n.map((x) => x.kind))
  for (const k of ['card', 'statement', 'util', 'premium', 'lowbal', 'nav', 'budget', 'stale', 'family']) assert.ok(kinds.has(k), k)
  assert.equal(n.find((x) => x.kind === 'lowbal').module, 'Bank Accounts')
  assert.equal(n[0].severity, 'high')
})

test('legacy plan that left monitoring asks for confirmation', () => {
  const n = buildNotifications({ budgets: [{ id: '2026-06', total: 1 }], legacy: [{ enabled: true, state: 'awaiting_confirmation', contacts: [] }] }, today)
  assert.ok(n.some((x) => x.kind === 'legacy' && x.severity === 'high'))
})

test('a fixed deposit that matures within a month, or has just matured, is a reminder; far ones and non-FDs are not', async () => {
  const { buildNotifications } = await import('./reminders.js')
  const today = new Date('2026-11-25T00:00:00')
  const fd = (id, maturityDate) => ({ id, name: 'FD ' + id, category: 'fd', principal: 100000, ratePct: 7, startDate: '2025-01-01', maturityDate })
  const n = buildNotifications({ assets: [fd('a', '2026-12-02'), fd('b', '2026-11-10'), fd('c', '2027-06-01'), fd('d', '2026-01-01'), { id: 'e', name: 'Gold', category: 'gold', maturityDate: '2026-12-01', startDate: '2025-01-01' }] }, today).filter((x) => x.kind === 'maturity')
  const by = Object.fromEntries(n.map((x) => [x.id, x]))
  assert.equal(by.a.title, 'FD a matures in 7 days')
  assert.equal(by.a.severity, 'medium')
  assert.equal(by.b.title, 'FD b has matured')
  assert.equal(by.c, undefined) // too far away
  assert.equal(by.d, undefined) // matured long ago
  assert.equal(by.e, undefined) // not a deposit
})
