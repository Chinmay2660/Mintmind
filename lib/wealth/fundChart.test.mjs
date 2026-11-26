import test from 'node:test'
import assert from 'node:assert/strict'
import { navSeries } from './fundChart.js'

const history = [{ date: '01-01-2025', nav: 10 }, { date: '02-01-2025', nav: 11 }, { date: '03-01-2025', nav: 12 }, { date: '04-01-2025', nav: 12 }]
const txns = [{ date: '2025-01-02', type: 'lumpsum', amount: 1100, units: 100 }]

test('value is units held then × that day NAV, and nothing is drawn before the first purchase', () => {
  const s = navSeries(history, txns)
  assert.deepEqual(s.map((p) => p.date), ['2025-01-02', '2025-01-03', '2025-01-04'])
  assert.deepEqual(s.map((p) => p.value), [1100, 1200, 1200])
  assert.equal(s[0].invested, 1100)
})
test('a sale lowers units and cost; no history gives no chart', () => {
  const s = navSeries(history, [...txns, { date: '2025-01-04', type: 'redeem', amount: 600, units: 50 }])
  assert.equal(s[2].value, 600)
  assert.equal(s[2].invested, 550)
  assert.deepEqual(navSeries([], txns), [])
})
