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
  assert.match(ask('explain xirr').text, /past performance|does not predict/)
})

test('spending by category and record search never expose full numbers', () => {
  assert.match(ask('How much did I spend on food last month?').text, /₹6,000/)
  const d2 = { ...data, bankAccounts: [{ id: 'b', bankName: 'HDFC', nickname: 'Salary', accountNumber: '50100234567891', currentBalance: 1 }] }
  const r = answerQuestion('show salary account', facts, d2)
  assert.ok(JSON.stringify(r).includes('••••7891'))
  assert.ok(!JSON.stringify(r).includes('50100234567891'))
})
