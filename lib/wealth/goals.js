// Goals (emergency fund, marriage fund, ...). A goal does not hold money: it LINKS to things you already track
// (bank/cash accounts, mutual funds, manual assets such as FD/EPF/gold) and shows how much of them is earmarked.
// Linking never changes net worth, so nothing is double counted; the same asset can back several goals only
// if the shares add up to 100% or less (otherwise a warning is shown).
import { addMonths, round2, toISO } from './calc.js'
import { assetValue } from './holdings.js'

export const GOAL_PRESETS = ['Emergency fund', 'Marriage fund', 'Home down payment', 'Child education', 'Vacation', 'Retirement', 'Car', 'Other']

/** value of a linked source today */
export function sourceValue(link, data) {
  if (link.type === 'bank') return data.bankAccounts.find((a) => a.id === link.id)?.currentBalance ?? 0
  if (link.type === 'fund') return data.funds.find((f) => f.id === link.id)?.currentValue ?? 0
  if (link.type === 'asset') return assetValue(data.assets.find((a) => a.id === link.id))
  return 0
}

export function sourceName(link, data) {
  const s = link.type === 'bank' ? data.bankAccounts.find((a) => a.id === link.id) : link.type === 'fund' ? data.funds.find((f) => f.id === link.id) : data.assets.find((a) => a.id === link.id)
  return s ? s.nickname || s.name || s.bankName : 'Removed item'
}

export function goalProgress(goal, data, today = new Date()) {
  const links = (goal.links || []).map((l) => ({ ...l, name: sourceName(l, data), value: sourceValue(l, data), counted: round2((sourceValue(l, data) * (Number(l.pct) || 0)) / 100) }))
  const current = round2(links.reduce((s, l) => s + l.counted, 0))
  const target = Number(goal.target) || 0
  const remaining = Math.max(round2(target - current), 0)
  const monthsLeft = goal.targetDate ? Math.max(Math.round((new Date(goal.targetDate) - new Date(toISO(today))) / (30.4375 * 86400000)), 0) : null
  return { links, current, target, remaining, pct: target > 0 ? Math.min(100, round2((current / target) * 100)) : 0, achieved: target > 0 && current >= target, monthsLeft, monthlyNeeded: monthsLeft && remaining > 0 ? round2(remaining / monthsLeft) : null, onTrackNote: monthsLeft === 0 && remaining > 0 ? 'Target date has passed' : null }
}

/** Sources whose shares add up to more than 100% across goals (they would be counted twice). */
export function overAllocated(goals) {
  const sum = {}
  for (const g of goals) for (const l of g.links || []) sum[`${l.type}:${l.id}`] = (sum[`${l.type}:${l.id}`] || 0) + (Number(l.pct) || 0)
  return Object.entries(sum).filter(([, v]) => v > 100).map(([k, v]) => ({ key: k, pct: v }))
}

/** Emergency fund target suggestion: 6 months of budgeted (or last month's) spending. */
export function emergencyTarget(facts) {
  const m = facts?.budget?.total || facts?.money?.lastMonth?.expense || facts?.money?.thisMonth?.expense || 0
  return m ? Math.round((m * 6) / 1000) * 1000 : 0
}

export { addMonths }
