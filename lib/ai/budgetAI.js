// Smart budgeting helpers: category suggestions (with learning from corrections), duplicate and recurring detection,
// unusual-spend detection and budget-adjustment suggestions. Deterministic and explainable; nothing here edits records:
// every result is a suggestion the user must accept.
import { round2 } from '../wealth/calc.js'

// merchant keyword -> [category hint, expense type]
const MERCHANTS = {
  swiggy: ['Food', 'Food delivery'], zomato: ['Food', 'Food delivery'], dominos: ['Food', 'Restaurant'], mcdonalds: ['Food', 'Restaurant'], starbucks: ['Food', 'Cafe'], restaurant: ['Food', 'Restaurant'], cafe: ['Food', 'Cafe'],
  amazon: ['Shopping', 'Online shopping'], flipkart: ['Shopping', 'Online shopping'], myntra: ['Shopping', 'Online shopping'], ajio: ['Shopping', 'Online shopping'], nykaa: ['Shopping', 'Online shopping'],
  netflix: ['Entertainment', 'Subscription'], spotify: ['Entertainment', 'Subscription'], hotstar: ['Entertainment', 'Subscription'], primevideo: ['Entertainment', 'Subscription'], youtube: ['Entertainment', 'Subscription'], bookmyshow: ['Entertainment', 'Movies'], pvr: ['Entertainment', 'Movies'], inox: ['Entertainment', 'Movies'],
  uber: ['Travel', 'Cab'], ola: ['Travel', 'Cab'], rapido: ['Travel', 'Cab'], irctc: ['Travel', 'Train'], makemytrip: ['Travel', 'Trip'], goibibo: ['Travel', 'Trip'], indigo: ['Travel', 'Flight'], petrol: ['Travel', 'Fuel'], fuel: ['Travel', 'Fuel'], fastag: ['Travel', 'Toll'],
  bigbasket: ['Groceries', 'Groceries'], blinkit: ['Groceries', 'Groceries'], zepto: ['Groceries', 'Groceries'], dmart: ['Groceries', 'Groceries'], instamart: ['Groceries', 'Groceries'], grocery: ['Groceries', 'Groceries'],
  electricity: ['Bills', 'Utility bill'], airtel: ['Bills', 'Telecom'], jio: ['Bills', 'Telecom'], vodafone: ['Bills', 'Telecom'], broadband: ['Bills', 'Internet'], recharge: ['Bills', 'Telecom'], gas: ['Bills', 'Utility bill'], water: ['Bills', 'Utility bill'], rent: ['Bills', 'Rent'],
  apollo: ['Healthcare', 'Pharmacy'], pharmacy: ['Healthcare', 'Pharmacy'], '1mg': ['Healthcare', 'Pharmacy'], pharmeasy: ['Healthcare', 'Pharmacy'], hospital: ['Healthcare', 'Hospital'], clinic: ['Healthcare', 'Doctor'],
}
// category aliases so hints map to whatever the user named their categories
const ALIASES = { Food: ['food', 'dining', 'restaurant'], Shopping: ['shopping'], Entertainment: ['entertainment', 'subscription'], Travel: ['travel', 'transport'], Groceries: ['groceries', 'grocery'], Bills: ['bills', 'utilities'], Healthcare: ['health', 'medical'] }
const SUBSCRIPTION_WORDS = ['netflix', 'spotify', 'hotstar', 'primevideo', 'youtube', 'subscription']

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

/** The merchant key we group and learn by: a known merchant word, otherwise the first meaningful word. */
export function merchantKey(note) {
  const words = norm(note).split(' ').filter(Boolean)
  for (const w of words) if (MERCHANTS[w]) return w
  const joined = words.join('')
  for (const m of Object.keys(MERCHANTS)) if (joined.includes(m)) return m
  return words.find((w) => w.length >= 3 && !/^\d+$/.test(w)) || ''
}

function resolveCategory(hint, categories) {
  const lower = categories.map((c) => c.toLowerCase())
  const exact = lower.indexOf(hint.toLowerCase())
  if (exact >= 0) return categories[exact]
  for (const a of ALIASES[hint] || []) { const i = lower.findIndex((c) => c.includes(a)); if (i >= 0) return categories[i] }
  return null
}

/**
 * Suggest category / merchant / type for a description. `rules` = what the user taught us ({ merchantKey: category }).
 * Returns null when there is nothing to go on; never invents a category that is not in the user's list.
 */
export function suggestCategory(note, categories, rules = {}) {
  const key = merchantKey(note)
  if (!key) return null
  const learned = rules[key]
  if (learned && categories.includes(learned)) return { merchant: key, category: learned, expenseType: null, source: 'learned', confidence: 'high', subscription: SUBSCRIPTION_WORDS.includes(key) }
  const m = MERCHANTS[key]
  if (!m) return null
  const category = resolveCategory(m[0], categories)
  if (!category) return null
  return { merchant: key, category, expenseType: m[1], source: 'rule', confidence: 'medium', subscription: m[1] === 'Subscription' }
}

/** Remember a correction: next time this merchant is typed, the corrected category is suggested. */
export const learnCorrection = (rules, note, category) => { const key = merchantKey(note); return key ? { ...rules, [key]: category } : rules }

const dayDiff = (a, b) => Math.abs(Math.round((new Date(a) - new Date(b)) / 86400000))

/** Possible duplicates of a new entry among existing expenses: same amount within 1 day, and same merchant or category. */
export function findDuplicates(entry, expenses) {
  const key = merchantKey(entry.note)
  return expenses.filter((e) => e.id !== entry.id && Number(e.amount) === Number(entry.amount) && dayDiff(e.date, entry.date) <= 1 && (e.category === entry.category || (key && merchantKey(e.note) === key)))
}

/** Expenses that repeat roughly monthly with a similar amount: likely subscriptions / recurring bills. */
export function detectRecurring(expenses) {
  const groups = new Map()
  for (const e of expenses) {
    const k = merchantKey(e.note) || `${e.category}:${Math.round(Number(e.amount) / 50) * 50}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(e)
  }
  const out = []
  for (const [k, list] of groups) {
    const months = new Map()
    for (const e of list) months.set(String(e.date).slice(0, 7), e)
    if (months.size < 3) continue
    const sorted = [...months.entries()].sort((a, z) => a[0].localeCompare(z[0]))
    const amounts = sorted.map(([, e]) => Number(e.amount))
    const avg = amounts.reduce((s, x) => s + x, 0) / amounts.length
    const stable = amounts.every((a) => Math.abs(a - avg) <= avg * 0.1)
    const days = sorted.map(([, e]) => Number(String(e.date).slice(8, 10)))
    const dayAvg = days.reduce((s, x) => s + x, 0) / days.length
    const regular = days.every((d) => Math.abs(d - dayAvg) <= 4)
    const consecutive = sorted.every(([m], i) => i === 0 || monthGap(sorted[i - 1][0], m) === 1)
    if (stable && regular && consecutive) out.push({ merchant: k, amount: round2(avg), dayOfMonth: Math.round(dayAvg), months: sorted.length, lastDate: sorted[sorted.length - 1][1].date, category: sorted[0][1].category, likelySubscription: SUBSCRIPTION_WORDS.includes(k) })
  }
  return out.sort((a, z) => z.amount - a.amount)
}
const monthGap = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))

/** Category spend that is well above its usual level, and single unusually large expenses. */
export function unusualSpending(facts, expenses) {
  const out = []
  const b = facts.budget
  if (!b) return out
  for (const c of b.categories) {
    if (c.avg3m > 0 && c.spent > c.avg3m * 1.5 && c.spent - c.avg3m >= 1000) out.push({ type: 'category', category: c.name, spent: c.spent, usual: c.avg3m, text: `${c.name} spending (${c.spent.toLocaleString('en-IN')}) is much higher than your usual ${Math.round(c.avg3m).toLocaleString('en-IN')} a month.` })
  }
  const byCat = {}
  for (const e of expenses) (byCat[e.category] = byCat[e.category] || []).push(Number(e.amount))
  for (const e of expenses.filter((x) => String(x.date).slice(0, 7) === facts.ym)) {
    const list = (byCat[e.category] || []).filter(Boolean).sort((a, z) => a - z)
    if (list.length < 6) continue
    const median = list[Math.floor(list.length / 2)]
    if (Number(e.amount) >= median * 4 && Number(e.amount) >= 2000) out.push({ type: 'transaction', id: e.id, category: e.category, amount: Number(e.amount), usual: median, text: `A ${e.category} expense of ${Number(e.amount).toLocaleString('en-IN')} on ${e.date} is about ${Math.round(Number(e.amount) / median)}x your typical ${e.category} expense.` })
  }
  return out
}

/** Suggested limit changes based on the last three months. Suggestions only; the user decides. */
export function suggestBudgetAdjustments(facts) {
  const out = []
  const b = facts.budget
  if (!b) return out
  const round500 = (n) => Math.ceil(n / 500) * 500
  for (const c of b.categories) {
    if (c.limit > 0 && c.avg3m > c.limit * 1.15) out.push({ category: c.name, from: c.limit, to: round500(c.avg3m), avg: Math.round(c.avg3m), reason: `You averaged ${Math.round(c.avg3m).toLocaleString('en-IN')} a month over the last three months, above this limit.` })
    else if (c.limit > 0 && c.avg3m > 0 && c.avg3m < c.limit * 0.6) out.push({ category: c.name, from: c.limit, to: round500(c.avg3m * 1.1), reason: `You averaged only ${Math.round(c.avg3m).toLocaleString('en-IN')} a month over the last three months.` })
    else if (!c.limit && c.avg3m >= 1000) out.push({ category: c.name, from: 0, to: round500(c.avg3m * 1.1), avg: Math.round(c.avg3m), reason: `${c.name} has no limit but you averaged ${Math.round(c.avg3m).toLocaleString('en-IN')} a month.` })
  }
  return out
}
