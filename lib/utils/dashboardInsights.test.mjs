// Run: node --test lib/utils/dashboardInsights.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyCashFlow, findSpendingAlerts } from './dashboardInsights.js';

const now = new Date(2026, 8, 20); // 20 Sep 2026
const tx = (type, amount, y, m, d, name) => ({
  type,
  amount,
  date: new Date(y, m, d).toISOString(),
  categoryId: name ? { name } : undefined,
});

test('monthlyCashFlow buckets by month and ignores transfers / out-of-range', () => {
  const flow = monthlyCashFlow(
    [
      tx('income', 1000, 2026, 8, 1),
      tx('expense', 300, 2026, 8, 5),
      tx('expense', 200, 2026, 3, 15),
      tx('transfer', 999, 2026, 8, 2),
      tx('expense', 50, 2026, 2, 1), // March: outside 6-month window
    ],
    6,
    now
  );
  assert.deepEqual(flow.map((m) => m.label), ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']);
  assert.deepEqual(flow[5], { label: 'Sep', income: 1000, expense: 300 });
  assert.equal(flow[0].expense, 200);
});

test('findSpendingAlerts returns categories above average, worst first, with severity', () => {
  const data = [
    ...[5, 6, 7].map((m) => tx('expense', 3000, 2026, m, 10, 'Dining')),
    ...[5, 6, 7].map((m) => tx('expense', 1000, 2026, m, 10, 'Shopping')),
    ...[5, 6, 7].map((m) => tx('expense', 10000, 2026, m, 10, 'Rent')),
    tx('expense', 4500, 2026, 8, 3, 'Dining'), // +50% -> warning
    tx('expense', 2500, 2026, 8, 4, 'Shopping'), // +150% -> critical
    tx('expense', 10000, 2026, 8, 1, 'Rent'), // flat -> no alert
    tx('expense', 9000, 2026, 8, 2, 'Gadgets'), // no history -> no alert
  ];
  const alerts = findSpendingAlerts(data, now);
  assert.deepEqual(
    alerts.map((a) => [a.category, Math.round(a.pctAbove * 100), a.severity]),
    [
      ['Shopping', 150, 'critical'],
      ['Dining', 50, 'warning'],
    ]
  );
});

test('findSpendingAlerts returns [] with no history or empty input', () => {
  assert.deepEqual(findSpendingAlerts([tx('expense', 9000, 2026, 8, 2, 'Gadgets')], now), []);
  assert.deepEqual(findSpendingAlerts(undefined, now), []);
});
