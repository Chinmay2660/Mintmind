// Server-only AI provider layer. The app is not tied to one vendor: set AI_PROVIDER to anthropic or openai
// (any OpenAI-compatible endpoint via AI_BASE_URL). Keys live only in server environment variables.
// The model is only ever given pre-calculated facts to phrase; it never calculates, decides or edits anything.

export function aiConfig() {
  const provider = (process.env.AI_PROVIDER || 'none').toLowerCase()
  const key = process.env.AI_API_KEY || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : provider === 'openai' ? process.env.OPENAI_API_KEY : '')
  return {
    provider,
    configured: provider !== 'none' && !!key,
    key,
    model: process.env.AI_MODEL || (provider === 'anthropic' ? 'claude-haiku-5-5' : 'gpt-4o-mini'),
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    dailyLimit: Number(process.env.AI_DAILY_LIMIT) || 30,
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 600,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 12000,
    priceInPerMTok: Number(process.env.AI_PRICE_IN_PER_MTOK) || 0,
    priceOutPerMTok: Number(process.env.AI_PRICE_OUT_PER_MTOK) || 0,
  }
}

/** Removes identifiers that must never reach a provider: Aadhaar, PAN, long account/card numbers, JWT/API-key-like tokens. */
export function redact(text) {
  return String(text)
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[AADHAAR]')
    .replace(/\b\d{9,19}\b/g, (m) => `••••${m.slice(-4)}`)
    .replace(/\b(?:sk|pk|ya29|eyJ)[A-Za-z0-9_\-.]{16,}\b/g, '[TOKEN]')
}

export const SYSTEM_PROMPT = [
  'You are My Wealth AI inside a personal finance app for an Indian household.',
  'You receive FACTS (JSON) that were calculated by the application, and the user\'s QUESTION.',
  'Rules:',
  '1. Use ONLY numbers present in FACTS. Never invent, estimate or recalculate figures. If the facts do not contain the answer, say so plainly.',
  '2. Mention the data period the figures refer to. Label projections as estimates and past returns as historical performance.',
  '3. Do not give buy, sell or hold instructions, or predict returns. Educational explanations only.',
  '4. Keep it short, simple and in plain English. Use Indian rupee formatting (e.g. ₹1,25,000).',
  '5. Never ask for or repeat passwords, PAN, Aadhaar, full account numbers or credentials.',
].join('\n')

async function withTimeout(run, ms) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await run(ctrl.signal)
  } finally {
    clearTimeout(t)
  }
}

const adapters = {
  async anthropic(c, { system, user, maxTokens }) {
    return withTimeout(async (signal) => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal,
        headers: { 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: c.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      })
      if (!res.ok) throw new Error(`provider_${res.status}`)
      const j = await res.json()
      return { text: (j.content || []).map((b) => b.text || '').join('').trim(), inputTokens: j.usage?.input_tokens || 0, outputTokens: j.usage?.output_tokens || 0 }
    }, c.timeoutMs)
  },
  async openai(c, { system, user, maxTokens }) {
    return withTimeout(async (signal) => {
      const res = await fetch(`${c.baseUrl}/chat/completions`, {
        method: 'POST', signal,
        headers: { Authorization: `Bearer ${c.key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: c.model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      })
      if (!res.ok) throw new Error(`provider_${res.status}`)
      const j = await res.json()
      return { text: (j.choices?.[0]?.message?.content || '').trim(), inputTokens: j.usage?.prompt_tokens || 0, outputTokens: j.usage?.completion_tokens || 0 }
    }, c.timeoutMs)
  },
}

/** Calls the configured provider. Throws on any failure so callers can fall back to the built-in answer. */
export async function complete({ system = SYSTEM_PROMPT, user, maxTokens }) {
  const c = aiConfig()
  if (!c.configured) throw new Error('not_configured')
  const adapter = adapters[c.provider]
  if (!adapter) throw new Error('unsupported_provider')
  const out = await adapter(c, { system, user: redact(user), maxTokens: maxTokens || c.maxTokens })
  if (!out.text) throw new Error('empty_response')
  return { ...out, provider: c.provider, model: c.model }
}
