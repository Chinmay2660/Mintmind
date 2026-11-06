// Turns a sentence like "450 lunch with card yesterday" into an expense draft. Rule-based and deterministic:
// nothing is saved until the user confirms the preview.
const DAY = 86400000
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export const CATEGORY_KEYWORDS = {
  Food: ['lunch', 'dinner', 'breakfast', 'coffee', 'tea', 'restaurant', 'zomato', 'swiggy', 'snack', 'snacks', 'pizza', 'burger', 'cafe', 'food'],
  Groceries: ['grocery', 'groceries', 'vegetables', 'fruits', 'milk', 'supermarket', 'bigbasket', 'blinkit', 'zepto'],
  Travel: ['uber', 'ola', 'cab', 'taxi', 'petrol', 'diesel', 'fuel', 'metro', 'bus', 'train', 'flight', 'auto', 'parking', 'toll'],
  Shopping: ['amazon', 'flipkart', 'shopping', 'clothes', 'shoes', 'myntra', 'gadget'],
  Entertainment: ['movie', 'netflix', 'spotify', 'game', 'concert', 'prime', 'hotstar'],
  Bills: ['electricity', 'bill', 'rent', 'wifi', 'internet', 'recharge', 'gas', 'water', 'broadband'],
  Healthcare: ['medicine', 'medicines', 'doctor', 'pharmacy', 'clinic', 'hospital', 'dentist', 'lab'],
}

function extractDate(text, today) {
  let t = text, date = null
  const take = (re, fn) => { const m = t.match(re); if (m) { date = fn(m); t = t.replace(m[0], ' ') } }
  take(/\bday before yesterday\b/i, () => new Date(today.getTime() - 2 * DAY))
  if (!date) take(/\byesterday\b/i, () => new Date(today.getTime() - DAY))
  if (!date) take(/\btoday\b/i, () => today)
  if (!date) take(/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => new Date(+m[1], +m[2] - 1, +m[3]))
  if (!date) take(/\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i, (m) => new Date(today.getFullYear(), MONTHS.indexOf(m[2].toLowerCase()), +m[1]))
  if (!date) take(/\b(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/i, (m) => new Date(today.getFullYear(), MONTHS.indexOf(m[1].toLowerCase()), +m[2]))
  if (!date) take(/\b(?:last\s+|on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i, (m) => { const want = WEEKDAYS.indexOf(m[1].toLowerCase()); let back = (today.getDay() - want + 7) % 7; if (back === 0) back = 7; return new Date(today.getTime() - back * DAY) })
  if (date && date > today) date = new Date(date.getFullYear() - 1, date.getMonth(), date.getDate()) // no future expenses
  return { date: date ? iso(date) : iso(today), rest: t, found: !!date }
}

function extractAmount(text) {
  const m = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d{2,3})*(?:\.\d+)?)\s*(k|thousand|lakh|lac)?\b/i)
  if (!m) return { amount: null, rest: text }
  let n = Number(m[1].replace(/,/g, ''))
  const unit = (m[2] || '').toLowerCase()
  if (unit === 'k' || unit === 'thousand') n *= 1000
  if (unit === 'lakh' || unit === 'lac') n *= 100000
  return { amount: Math.round(n * 100) / 100, rest: text.replace(m[0], ' ') }
}

const MODES = [['debit', /\bdebit( card)?\b/i], ['card', /\b(credit card|card|cc)\b/i], ['cash', /\bcash\b/i], ['bank', /\b(net ?banking|bank transfer|transfer|neft|imps)\b/i], ['upi', /\b(upi|gpay|google pay|phonepe|paytm)\b/i]]

/** categories: the user's category names. Returns { amount, date, category, mode, note, confident } */
export function parseExpenseText(input, { categories = Object.keys(CATEGORY_KEYWORDS), today = new Date() } = {}) {
  const text = String(input || '').trim()
  if (!text) return null
  const d = extractDate(text, new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  const a = extractAmount(d.rest)
  let mode = 'upi', modeFound = false, rest = a.rest
  for (const [m, re] of MODES) { if (re.test(rest)) { mode = m; modeFound = true; rest = rest.replace(re, ' '); break } }
  const words = rest.toLowerCase().match(/[a-z]+/g) || []
  let category = null
  for (const [cat, keys] of Object.entries(CATEGORY_KEYWORDS)) if (words.some((w) => keys.includes(w))) { category = cat; break }
  const resolved = category && categories.find((c) => c.toLowerCase() === category.toLowerCase())
  const own = categories.find((c) => words.includes(c.toLowerCase()))
  const finalCat = resolved || own || (categories.find((c) => c.toLowerCase() === 'other') ?? 'Other')
  const note = rest.replace(/\b(on|for|at|with|via|using|paid|spent|by|in|the|a|an)\b/gi, ' ').replace(/\s+/g, ' ').trim()
  return { amount: a.amount, date: d.date, category: finalCat, mode, note: note ? note[0].toUpperCase() + note.slice(1) : '', confident: !!(a.amount && (resolved || own)), modeFound }
}
