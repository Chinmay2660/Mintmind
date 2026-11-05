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
