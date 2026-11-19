/**
 * The app keeps your money data on your device. These server routes are an older design that stored the same records
 * in the database in plain form, and nothing in the app calls them any more. They are switched off unless
 * ALLOW_LEGACY_API=1 is set, so there is no endpoint through which that data could be written or read.
 */
export const RETIRED_API = [
  'allocation-targets', 'bank-accounts', 'budgets', 'cash', 'categories', 'credit-cards', 'dashboard', 'debit-cards',
  'emergency-fund', 'family', 'goals', 'import', 'insurance', 'investments', 'loan-payments', 'loans', 'mf-transactions',
  'passwords', 'recurring-expenses', 'rules', 'salary', 'seed', 'sip-plans', 'subscriptions', 'tags', 'transactions',
]

export function isRetiredApi(pathname, env = process.env) {
  if (env.ALLOW_LEGACY_API === '1') return false
  const m = /^\/api\/([^/]+)/.exec(pathname)
  return !!m && RETIRED_API.includes(m[1])
}
