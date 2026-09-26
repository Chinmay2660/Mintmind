const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;

/**
 * Income vs expense per calendar month, oldest first, ending with the current month.
 * Transfers are ignored.
 */
export function monthlyCashFlow(transactions, months = 6, now = new Date()) {
  const buckets = [];
  const byKey = new Map();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const bucket = { label: MONTH_LABELS[d.getMonth()], income: 0, expense: 0 };
    buckets.push(bucket);
    byKey.set(monthKey(d), bucket);
  }

  for (const tx of transactions ?? []) {
    if (!tx?.date || (tx.type !== 'income' && tx.type !== 'expense')) continue;
    const bucket = byKey.get(monthKey(new Date(tx.date)));
    if (bucket) bucket[tx.type] += Number(tx.amount) || 0;
  }
  return buckets;
}

/**
 * Expense categories above their average of the previous `lookback` full months,
 * worst first. `severity` is 'critical' at >= criticalAt above average, else 'warning'.
 * Categories with no history are skipped.
 */
export function findSpendingAlerts(
  transactions,
  now = new Date(),
  { lookback = 3, threshold = 0.15, criticalAt = 1, minAmount = 500 } = {}
) {
  const currentKey = monthKey(now);
  const priorKeys = new Set(
    Array.from({ length: lookback }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - 1 - i, 1)))
  );

  const current = new Map();
  const prior = new Map();
  for (const tx of transactions ?? []) {
    if (tx?.type !== 'expense' || !tx.date) continue;
    const name = tx.categoryId?.name;
    if (!name) continue;
    const key = monthKey(new Date(tx.date));
    const target = key === currentKey ? current : priorKeys.has(key) ? prior : null;
    if (target) target.set(name, (target.get(name) ?? 0) + (Number(tx.amount) || 0));
  }

  const alerts = [];
  for (const [category, spent] of current) {
    const average = (prior.get(category) ?? 0) / lookback;
    if (average <= 0 || spent < minAmount) continue;
    const pctAbove = (spent - average) / average;
    if (pctAbove > threshold) {
      alerts.push({
        category,
        spent,
        average,
        pctAbove,
        severity: pctAbove >= criticalAt ? 'critical' : 'warning',
      });
    }
  }
  return alerts.sort((a, b) => b.pctAbove - a.pctAbove);
}
