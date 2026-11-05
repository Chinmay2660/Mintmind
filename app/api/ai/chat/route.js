import { NextResponse } from 'next/server'
import { featureGate } from '@/lib/features/server'
import connectDB from '@/lib/mongodb'
import AiUsage from '@/models/AiUsage'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { aiConfig, complete, redact } from '@/lib/ai/provider'

const day = () => new Date().toISOString().slice(0, 10)

/**
 * POST { question, facts, draft, consent }
 * Optional natural-language layer. The app already has a complete, deterministic answer (`draft`); the provider only
 * rewrites it conversationally using the same pre-calculated facts. Any problem returns { fallback: true } and the
 * client keeps the built-in answer. Demo accounts have no auth token, so they can never reach this route.
 */
export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'ai-chat', limit: 10, windowMs: 60_000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'ai_assistant'); if (gate) return gate }

  const c = aiConfig()
  if (!c.configured) return NextResponse.json({ fallback: true, reason: 'not_configured' })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (body.consent !== true) return NextResponse.json({ error: 'Consent is required to use an AI provider', fallback: true, reason: 'no_consent' }, { status: 403 })
  const question = String(body.question || '').slice(0, 500)
  const draft = String(body.draft || '').slice(0, 2500)
  const factsJson = JSON.stringify(body.facts || {})
  if (!question) return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  if (factsJson.length > 40_000) return NextResponse.json({ error: 'Facts payload too large' }, { status: 413 })

  await connectDB()
  const today = day()
  const usage = await AiUsage.findOne({ userId: user._id, day: today })
  if ((usage?.requests || 0) >= c.dailyLimit) return NextResponse.json({ fallback: true, reason: 'daily_limit', limit: c.dailyLimit })

  try {
    const out = await complete({ user: `QUESTION: ${redact(question)}\n\nFACTS (calculated by the app):\n${factsJson}\n\nBUILT-IN ANSWER (for reference):\n${draft}` })
    await AiUsage.updateOne({ userId: user._id, day: today }, { $inc: { requests: 1, inputTokens: out.inputTokens, outputTokens: out.outputTokens } }, { upsert: true })
    return NextResponse.json({ text: out.text, provider: out.provider, model: out.model })
  } catch (e) {
    await AiUsage.updateOne({ userId: user._id, day: today }, { $inc: { requests: 1, failures: 1 } }, { upsert: true }).catch(() => {})
    // log the error class only, never the prompt or the data
    console.error('ai-chat failed:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ fallback: true, reason: 'provider_error' })
  }
}
