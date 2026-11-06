import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import MarketPrice from '@/models/MarketPrice'
import MarketMeta from '@/models/MarketMeta'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { matchFund, nameKey } from '@/lib/market/parsers'

/**
 * Latest cached NAV for the funds the browser sends: [{ id, name, isin?, symbol?, schemeCode? }].
 * Funds stay on the user's device; this only reads the shared price cache. Unmatched funds are simply omitted.
 */
export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'market-prices', limit: 20, windowMs: 60_000 })
  if (limited) return limited
  const { response } = await requireAuth()
  if (response) return response
  const { funds } = await request.json().catch(() => ({}))
  if (!Array.isArray(funds) || funds.length > 200) return NextResponse.json({ error: 'Send up to 200 funds' }, { status: 400 })

  await connectDB()
  const ids = [...new Set(funds.flatMap((f) => [f.isin, f.symbol]).filter(Boolean))]
  const codes = [...new Set(funds.map((f) => f.schemeCode).filter(Boolean).map(String))]
  const rows = await MarketPrice.find({ kind: 'mf', $or: [{ isins: { $in: ids } }, { symbol: { $in: ids } }, { schemeCode: { $in: codes } }, { nameKey: { $in: [...new Set(funds.map((f) => nameKey(f.name)).filter(Boolean))] } }] }).lean()
  const prices = []
  for (const f of funds) {
    const r = matchFund(f, rows)
    if (r) prices.push({ id: f.id, nav: r.price, date: r.priceDate, source: r.source })
  }
  const meta = await MarketMeta.findOne({ key: 'sync' }).lean()
  return NextResponse.json({ prices, lastSyncAt: meta?.lastSyncAt ?? null })
}
