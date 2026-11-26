// My Wealth AI guardrails (pure, tested). The same checks run in the browser before a question is answered and on the
// server before anything reaches an AI provider. They never need the network and never call a model.
//
//  1. Sensitive identifiers (PAN, Aadhaar, card and account numbers, tokens, OTPs) are removed and the user is told.
//  2. Attempts to override the rules or read the hidden prompt are refused.
//  3. Requests to move money, change records or show vault secrets are refused: the assistant only reads and explains.
//  4. Requests for buy / sell calls, return guarantees or tax evasion are redirected to educational information.
//  5. Clearly unrelated requests (code, poems, recipes) are declined.
//  6. Whatever a provider writes is checked again; unsafe text is dropped and the built-in answer is used instead.

export const MAX_QUESTION = 500

const PATTERNS = {
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
  longNumber: /\b\d{9,19}\b/g,
  token: /\b(?:sk|pk|ya29|eyJ)[A-Za-z0-9_\-.]{16,}\b/g,
  otp: /\b(?:otp|one[\s-]?time\s+(?:password|code)|cvv|pin)\b\s*(?:is|:|=)?\s*\d{3,8}\b/gi,
}

/** Removes identifiers that must never reach a provider. Returns the cleaned text and what kinds were found. */
export function redactSensitive(text) {
  const found = new Set()
  let out = String(text ?? '')
  out = out.replace(PATTERNS.otp, () => { found.add('a code or PIN'); return '[CODE]' })
  out = out.replace(PATTERNS.token, () => { found.add('a key or token'); return '[TOKEN]' })
  out = out.replace(PATTERNS.pan, () => { found.add('a PAN'); return '[PAN]' })
  out = out.replace(PATTERNS.aadhaar, () => { found.add('an Aadhaar number'); return '[AADHAAR]' })
  out = out.replace(PATTERNS.longNumber, (m) => { found.add('an account or card number'); return `••••${m.slice(-4)}` })
  return { text: out, found: [...found] }
}

const INJECTION = [
  /ignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|earlier|your)\s+(?:instructions?|rules?|prompts?)/i,
  /disregard\s+(?:all\s+|the\s+)?(?:previous|prior|above|your)\s+(?:instructions?|rules?)/i,
  /(?:reveal|show|print|repeat|leak|tell me)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?|api\s*key|secret)/i,
  /you\s+are\s+now\s+(?:a|an|in)\b/i,
  /pretend\s+(?:to\s+be|you\s+are)\b/i,
  /\b(?:jailbreak|dan\s+mode|developer\s+mode|do\s+anything\s+now)\b/i,
  /act\s+as\s+(?:if\s+you\s+(?:have|had)\s+no|an?\s+unrestricted)/i,
]
const SECRETS = /\b(?:show|read|reveal|tell|give|list|what(?:'s| is| are))\b[^.?!]{0,40}\b(?:passwords?|vault|master\s+password|recovery\s+key|private\s+key|secure\s+notes?)\b/i
// Commands only ("transfer 5000 to ...", "please delete my data"), not questions that merely mention an account.
const ACTIONS = /^(?:please\s+|can\s+you\s+|could\s+you\s+|i\s+(?:want|need)\s+(?:you\s+)?to\s+)?(?:transfer|send|pay|wire|move|withdraw|delete|erase|wipe|close)\b[^?]*$/i
const ADVICE = [
  /\b(?:should\s+i|which|what)\b[^.?!]{0,30}\b(?:buy|sell|short|invest\s+in)\b/i,
  /\bguarantee(?:d)?\s+returns?\b/i,
  /\b(?:best|top)\s+(?:stock|share|mutual\s+fund|crypto)s?\s+to\s+(?:buy|invest)/i,
  /\bwill\s+(?:the\s+)?(?:market|nifty|sensex|stock|price)\b[^.?!]{0,20}\b(?:go|rise|fall|crash|hit)\b/i,
  /\b(?:evade|avoid\s+paying|hide)\b[^.?!]{0,20}\btax/i,
]
const OFF_TOPIC = /\b(?:write|compose|generate)\s+(?:me\s+)?(?:a\s+|an\s+)?(?:poem|song|story|essay|code|script|program|joke|email\s+to)\b|\b(?:recipe|weather\s+(?:in|today)|who\s+won\s+the|translate\s+this|capital\s+of)\b/i

export const REFUSALS = {
  injection: "I can't change my rules or share how I'm set up. I can still answer questions about your net worth, budget, funds, cards, insurance and family finances.",
  secrets: 'I never read or show anything from your Vault or any password. Open My Vault yourself to see those.',
  action: 'I can only read and explain your data. I can\'t move money, pay bills or change or delete records. You can do that from the relevant page.',
  advice: "I can't tell you what to buy or sell, or predict returns. I can show how your holdings have performed, explain terms, or compare against your goals. For personal advice, speak to a SEBI-registered adviser.",
  offTopic: "That's outside what I can help with here. Ask me about your money: net worth, spending, budget, funds, cards, insurance or goals.",
  tooLong: `Please keep your question under ${MAX_QUESTION} characters.`,
  empty: 'Type a question about your money first.',
}

/**
 * Checks a question before it is answered or sent anywhere.
 * { ok, kind?, message?, text, warnings } - when ok is false, show `message` and do not call a provider.
 */
export function checkQuestion(raw) {
  const original = String(raw ?? '').trim()
  if (!original) return { ok: false, kind: 'empty', message: REFUSALS.empty, text: '', warnings: [] }
  if (original.length > MAX_QUESTION) return { ok: false, kind: 'tooLong', message: REFUSALS.tooLong, text: original.slice(0, MAX_QUESTION), warnings: [] }
  const { text, found } = redactSensitive(original)
  const warnings = found.length ? [`I removed ${found.join(', ')} from your message. Please don't share those here.`] : []
  const refuse = (kind) => ({ ok: false, kind, message: REFUSALS[kind], text, warnings })
  if (INJECTION.some((r) => r.test(original))) return refuse('injection')
  if (SECRETS.test(original)) return refuse('secrets')
  if (ACTIONS.test(original)) return refuse('action')
  if (ADVICE.some((r) => r.test(original))) return refuse('advice')
  if (OFF_TOPIC.test(original)) return refuse('offTopic')
  return { ok: true, text, warnings }
}

const DIRECTIVE = /\b(?:you\s+should|i\s+(?:strongly\s+)?(?:recommend|suggest|advise)|i\s+would\s+(?:buy|sell)|go\s+ahead\s+and|make\s+sure\s+you)\s+(?:to\s+)?(?:buy|sell|invest|switch|redeem|put\s+(?:all|your))\b/i
const PREDICT = /\b(?:will\s+(?:definitely|surely|certainly)|guaranteed?\s+(?:to|returns?)|assured\s+returns?|risk[\s-]free\s+returns?)\b/i

/** Checks text written by a provider. Unsafe text is rejected so the built-in answer is shown instead. */
export function checkAnswer(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return { ok: false, reason: 'empty', text: '' }
  if (text.length > 2500) return { ok: false, reason: 'too_long', text: '' }
  if (DIRECTIVE.test(text)) return { ok: false, reason: 'directive', text: '' }
  if (PREDICT.test(text)) return { ok: false, reason: 'prediction', text: '' }
  if (INJECTION.some((r) => r.test(text))) return { ok: false, reason: 'injection', text: '' }
  const { text: safe, found } = redactSensitive(text)
  return { ok: true, text: safe, redacted: found.length > 0 }
}
