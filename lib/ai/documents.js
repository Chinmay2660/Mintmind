// Document classification from the file name only: runs in the browser and sends nothing anywhere.
// Reading the CONTENT of a document (policy number, premium, balances) needs OCR / an AI provider and the user's
// explicit consent; that step is not enabled in this build (see the implementation report).
const RULES = [
  { category: 'Identity', type: 'PAN card', re: /\bpan\b/i }, { category: 'Identity', type: 'Aadhaar', re: /aadhaar|aadhar|uidai/i }, { category: 'Identity', type: 'Passport / licence', re: /passport|driving|licen[cs]e|voter/i },
  { category: 'Insurance', type: 'Insurance policy', re: /policy|insurance|premium|lic\b|star ?health|hdfc ?life|icici ?lombard|bajaj ?allianz|health ?card/i },
  { category: 'Bank', type: 'Bank statement', re: /statement|passbook|bank|cheque|\bfd\b|fixed ?deposit|hdfc|sbi|icici|axis|kotak/i },
  { category: 'Investment', type: 'Mutual fund / investment statement', re: /\bcas\b|mutual|folio|nav|demat|holding|zerodha|groww|capital ?gain|portfolio|epf|ppf|nps/i },
  { category: 'Property', type: 'Property / loan document', re: /deed|property|agreement|registry|loan|emi|sanction|home ?loan|car ?loan|rent|lease/i },
  { category: 'Personal', type: 'Tax document', re: /\bitr\b|form ?16|26as|\btax\b|gst|return/i },
  { category: 'Family', type: 'Family document', re: /marriage|birth|will\b|nominee|family/i },
]
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function classifyDocument(fileName) {
  const base = String(fileName || '').replace(/\.[^.]+$/, '')
  const spaced = base.replace(/[_-]+/g, ' ')
  const hit = RULES.find((r) => r.re.test(spaced))
  const m = base.toLowerCase().match(new RegExp(`(${MONTHS.join('|')})[a-z]*[-_ ]?(20\\d{2}|\\d{2})\\b`))
  const y = base.match(/\b(20\d{2})\b/)
  const period = m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2].length === 2 ? `20${m[2]}` : m[2]}` : y ? y[1] : null
  const clean = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  const suggestedName = hit ? `${hit.type}${period ? `, ${period}` : ''}` : clean
  return hit ? { category: hit.category, type: hit.type, suggestedName, period, confidence: 'medium', source: 'file name' } : { category: null, type: null, suggestedName: clean, period, confidence: 'none', source: 'file name' }
}

/** Natural-language style document search over names, categories, notes and file names. */
export function searchDocuments(query, docs) {
  const stop = new Set(['show', 'find', 'all', 'my', 'the', 'latest', 'document', 'documents', 'related', 'for', 'to', 'of', 'and'])
  const words = String(query).toLowerCase().split(/\s+/).filter((w) => w.length > 1 && !stop.has(w))
  if (!words.length) return docs
  const scored = docs.map((d) => {
    const hay = `${d.name} ${d.category} ${d.notes || ''} ${d.fileName || ''}`.toLowerCase()
    return { d, score: words.filter((w) => hay.includes(w)).length }
  }).filter((x) => x.score > 0)
  return scored.sort((a, z) => z.score - a.score || String(z.d.uploaded).localeCompare(String(a.d.uploaded))).map((x) => x.d)
}
