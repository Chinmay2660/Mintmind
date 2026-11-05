import { NextResponse } from 'next/server'
import { featureGate } from '@/lib/features/server'
import connectDB from '@/lib/mongodb'
import AiUsage from '@/models/AiUsage'
import { requireAuth } from '@/lib/middleware/api'
import { aiConfig } from '@/lib/ai/provider'

/** Provider status and today's usage / cost for the signed-in user. No keys or content are returned. */
export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'ai_assistant'); if (gate) return gate }
  const c = aiConfig()
  const base = { configured: c.configured, provider: c.configured ? c.provider : null, model: c.configured ? c.model : null, dailyLimit: c.dailyLimit }
  if (!c.configured) return NextResponse.json({ ...base, today: null })
  await connectDB()
  const day = new Date().toISOString().slice(0, 10)
  const u = await AiUsage.findOne({ userId: user._id, day })
  const input = u?.inputTokens || 0
  const output = u?.outputTokens || 0
  const cost = c.priceInPerMTok || c.priceOutPerMTok ? Math.round(((input * c.priceInPerMTok + output * c.priceOutPerMTok) / 1_000_000) * 10000) / 10000 : null
  return NextResponse.json({ ...base, today: { requests: u?.requests || 0, failures: u?.failures || 0, inputTokens: input, outputTokens: output, estimatedCost: cost } })
}
