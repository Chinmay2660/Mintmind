// The Transactions & budgets page has nine views. They are shown as four sections; a section with several views lists them as a
// second row. Pure helpers so the grouping can be tested and no view is ever left unreachable.

export const VIEWS = ['overview', 'transactions', 'calendar', 'review', 'monthly', 'summary', 'stats', 'cashflow', 'recurring']

export const GROUPS = [
  { key: 'overview', label: 'Overview', views: ['overview'] },
  { key: 'transactions', label: 'Transactions', views: ['transactions', 'calendar', 'review'] },
  { key: 'insights', label: 'Insights', views: ['monthly', 'summary', 'stats', 'cashflow'] },
  { key: 'recurring', label: 'Recurring', views: ['recurring'] },
]

export const VIEW_LABEL = {
  overview: 'Overview', transactions: 'List', calendar: 'Calendar', review: 'To review',
  monthly: 'Monthly', summary: 'Summary', stats: 'Stats', cashflow: 'Cash flow', recurring: 'Recurring',
}

export const groupOf = (view) => GROUPS.find((g) => g.views.includes(view))?.key ?? 'overview'

/** The view a section opens on: the one you used last in it, else its first. */
export function viewFor(groupKey, last = {}) {
  const g = GROUPS.find((x) => x.key === groupKey)
  if (!g) return 'overview'
  return g.views.includes(last[groupKey]) ? last[groupKey] : g.views[0]
}

/** Number keys 1 to 4 open the sections. */
export const KEY_GROUPS = { 1: 'overview', 2: 'transactions', 3: 'insights', 4: 'recurring' }
