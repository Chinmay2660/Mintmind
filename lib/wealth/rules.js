// Categorisation rules: "if the description contains X, the category is Y". Pure and tested.
// A rule matches when every word of its text appears in the description, in any order and any case.
// The first matching rule in the list wins, so the order of the list is the order of priority.

import { matchesAll } from '../search.js'

/** The first rule whose words all appear in `text`, or null. Rules without text or without a category never match. */
export function matchRule(rules, text, kind = 'expense') {
  if (!text || !String(text).trim()) return null
  for (const r of rules || []) {
    if (!r || r.enabled === false || !String(r.contains || '').trim() || !r.category) continue
    if ((r.kind || 'expense') !== kind) continue
    if (matchesAll(r.contains, text)) return r
  }
  return null
}

/**
 * What running the rules over past expenses would change: [{ id, from, to, rule }].
 * Expenses that already have the category are skipped. With `onlyOther`, only expenses still on "Other" are touched,
 * so a category you set by hand is never overwritten.
 */
export function previewRules(rules, expenses, { onlyOther = false } = {}) {
  const out = []
  for (const e of expenses || []) {
    if (onlyOther && e.category && e.category !== 'Other') continue
    const r = matchRule(rules, e.note, 'expense')
    if (r && r.category !== e.category) out.push({ id: e.id, from: e.category || 'Other', to: r.category, rule: r.contains })
  }
  return out
}
