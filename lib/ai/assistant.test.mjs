import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFacts } from './facts.js'
import { answerQuestion } from './assistant.js'
import { sampleData, TODAY } from './fixture.mjs'

const data = sampleData()
const facts = buildFacts(data, TODAY)
const ask = (q) => answerQuestion(q, facts, data)

test('net worth questions use real figures', () => {
  assert.match(ask('What is my current net worth?').text, /₹38,80,000/)
  assert.match(ask('How much do I owe?').text, /₹18,80,000/)
  assert.match(ask('What contributed most to my net worth growth?').text, /mutual fund/i)
})

test('budget answers separate daily allowance from remaining budget', () => {
  const a = ask('How much can I spend today?')
  assert.match(a.text, /₹0 today/)
  assert.match(a.text, /different measures/)
  assert.match(ask('Am I overspending this month?').text, /^Yes/)
  assert.match(ask('How much will I spend by the end of this month?').text, /Estimate.*₹42,000/)
  assert.match(ask('How much did I save last month?').text, /saved/)
})

test('funds, cards and insurance', () => {
  assert.match(ask('What is my total mutual fund investment?').text, /₹7,00,000/)
  assert.match(ask('Explain why my portfolio value changed this month').text, /market movement/)
  assert.match(ask('Which credit card payment is due next?').text, /HDFC Regalia/)
  assert.match(ask('Which card has the highest utilisation?').text, /75%/)
  assert.match(ask('Which insurance premiums are due soon?').text, /Star - Health/)
  assert.match(ask('Show my total health insurance coverage').text, /₹10,00,000/)
  assert.match(ask('Which family members are covered?').text, /Arjun, Priya/)
})

test('missing data is stated, never invented', () => {
  const a = ask('What is our consolidated family net worth?')
  assert.equal(a.unavailable, true)
  assert.match(a.text, /don't have/)
  assert.equal(ask('What is the weather today in Mumbai').unavailable, true)
})

test('spending by category and record search never expose full numbers', () => {
  assert.match(ask('How much did I spend on food last month?').text, /₹6,000/)
  const d2 = { ...data, bankAccounts: [{ id: 'b', bankName: 'HDFC', nickname: 'Salary', accountNumber: '50100234567891', currentBalance: 1 }] }
  const r = answerQuestion('show salary account', facts, d2)
  assert.ok(JSON.stringify(r).includes('••••7891'))
  assert.ok(!JSON.stringify(r).includes('50100234567891'))
})

test('goals: answers from linked items, or says plainly when none exist', () => {
  const none = answerQuestion('Am I on track for my goals?', facts, { ...data, goals: [] })
  assert.equal(none.unavailable, true)
  const withGoal = answerQuestion('How are my goals doing?', facts, { ...data, goals: [{ id: 'g1', name: 'Emergency fund', target: 100000, targetDate: '2027-06-10', links: [{ type: 'bank', id: data.bankAccounts[0]?.id, pct: 100 }] }] })
  assert.match(withGoal.text, /1 goal/)
  assert.equal(withGoal.rows[0][0], 'Emergency fund')
})

test('NPS, EPF and stocks: totals by kind from net worth assets', () => {
  const none = answerQuestion('How much is in my NPS and EPF?', facts, { ...data, assets: [] })
  assert.equal(none.unavailable, true)
  const a = answerQuestion('How much is in my NPS and EPF?', facts, { ...data, assets: [{ id: 'a1', name: 'NPS Tier I', category: 'nps', value: 150000 }, { id: 'a2', name: 'EPF', category: 'epf', value: 300000 }] })
  assert.deepEqual(a.rows.map((r) => r[0]), ['NPS', 'EPF'])
  assert.match(a.rows[0][1], /1,50,000/)
})

test('deposits, gold, ETFs and loans are answered from the new asset details', () => {
  const d = sampleData()
  d.assets = [
    { id: 'a1', category: 'fd', name: 'HDFC FD', principal: 100000, ratePct: 7, startDate: '2025-06-01', maturityDate: '2027-06-01', updated: '2026-01-01' },
    { id: 'a2', category: 'gold', name: 'Necklace', grams: 20, karat: 22, paidAmount: 100000, rate24: 7500, updated: '2026-01-01' },
    { id: 'a3', category: 'etf', name: 'Nippon Gold BeES', etfKind: 'Gold ETF', units: 100, avgPrice: 50, currentNav: 60, updated: '2026-01-01' },
    { id: 'a4', category: 'epf', name: 'EPF', employeeShare: 400000, employerShare: 300000, epsShare: 150000, updated: '2026-01-01' },
  ]
  d.liabilities = [{ id: 'l1', category: 'homeLoan', name: 'Home loan', outstanding: 2000000, emi: 25000, rate: 8.5 }]
  const f = buildFacts(d, TODAY)
  const a = (q) => answerQuestion(q, f, d)
  assert.match(a('Show my fixed deposits').text, /1 fixed deposit/)
  assert.match(a('How much gold do I have?').text, /1 physical item and 1 gold ETF/)
  assert.match(a('Show my ETFs').text, /up .*on/)
  assert.ok(a('How much is in my NPS and EPF?').rows.some(([k, v]) => /breakup/.test(k) && /Employee.*employer.*EPS/.test(v)))
  assert.match(a('What are my loans and EMIs?').text, /1 loan.*25,000/)
  assert.match(a('Which insurance premiums are due soon?').text, /premium|No|none/i) // "premium" must not be read as "EMI"
  assert.match(a('Show my recurring deposits').text, /recurring deposits/i)
})
