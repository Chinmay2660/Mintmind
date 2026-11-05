import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFacts } from './facts.js'
import { buildInsights } from './insights.js'
import { healthScore } from './health.js'
import { buildReport, reportToText } from './report.js'
import { redact } from './provider.js'
import { sampleData, TODAY } from './fixture.mjs'

const facts = buildFacts(sampleData(), TODAY)
const report = buildReport(facts, healthScore(facts, { monthlyIncome: 100000 }), buildInsights(facts))

test('report sections and summary agree with the facts', () => {
  assert.equal(report.headline[0][1], '₹38,80,000')
  assert.match(report.summary, /₹12,000|₹42,000/)
  assert.ok(report.sections.some((s) => s.title.startsWith('Mutual fund')))
  assert.ok(report.partial) // mid-month
  const text = reportToText(report)
  assert.match(text, /not financial advice/i)
  assert.match(text, /Net worth: ₹38,80,000/)
})

test('provider redaction removes identifiers', () => {
  const out = redact('PAN ABCDE1234F, aadhaar 1234 5678 9012, account 50100234567891, token sk-abcdefghijklmnopqrstuvwxyz')
  assert.ok(!out.includes('ABCDE1234F'))
  assert.ok(!out.includes('5678 9012'))
  assert.ok(!out.includes('50100234567891'))
  assert.ok(out.includes('••••7891'))
  assert.ok(!out.includes('sk-abcdefghijklmnopqrstuvwxyz'))
})
