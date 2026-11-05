import { NextResponse } from 'next/server'
import { featureGate } from '@/lib/features/server'
import connectDB from '@/lib/mongodb'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { KiteAuthError, getToken, kiteGet } from '@/lib/kite/client'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/**
 * Read-only fetch of Zerodha holdings, normalised for the browser to preview and apply.
 * Nothing is stored server-side except the sync timestamp. Orders are never placed.
 *   mutualFunds : GET /mf/holdings   (NAV = last_price on last_price_date)
 *   sips        : GET /mf/sips
 *   equity      : GET /portfolio/holdings (aggregated; no per-stock data leaves this response)
 * Each source is fetched independently so one failing scope (e.g. MF API not enabled) doesn't hide the rest.
 */
export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'kite-sync', limit: 10, windowMs: 60_000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'mutual_funds'); if (gate) return gate }
  const { include = ['mf', 'sips', 'equity'] } = await request.json().catch(() => ({}))

  try {
    await connectDB()
    const { token, conn } = await getToken(user._id)
    const out = { mutualFunds: null, sips: null, equity: null, errors: {} }

    const run = async (key, want, fn) => {
      if (!include.includes(want)) return
      try { out[key] = await fn() } catch (e) { if (e instanceof KiteAuthError) throw e; out.errors[key] = e.message }
    }

    await run('mutualFunds', 'mf', async () =>
      (await kiteGet(token, '/mf/holdings')).map((h) => ({
        folio: String(h.folio || ''), name: h.fund, symbol: h.tradingsymbol, units: num(h.quantity), averageNav: num(h.average_price), nav: num(h.last_price), navDate: h.last_price_date || null, pnl: num(h.pnl),
      })))
    await run('sips', 'sips', async () =>
      (await kiteGet(token, '/mf/sips')).map((s) => ({
        id: s.sip_id, symbol: s.tradingsymbol, name: s.fund, status: String(s.status || '').toLowerCase(), frequency: s.frequency, amount: num(s.instalment_amount), instalments: num(s.instalments), completed: num(s.completed_instalments), day: num(s.instalment_day), nextDate: s.next_instalment || null, created: s.created ? String(s.created).slice(0, 10) : null,
      })))
    await run('equity', 'equity', async () => {
      const rows = await kiteGet(token, '/portfolio/holdings')
      let value = 0, invested = 0, day = 0
      for (const r of rows) {
        const qty = num(r.quantity) + num(r.t1_quantity) // include T+1 settlement shares
        value += qty * num(r.last_price)
        invested += qty * num(r.average_price)
        day += qty * num(r.day_change)
      }
      return { count: rows.length, value: Math.round(value * 100) / 100, invested: Math.round(invested * 100) / 100, dayChange: Math.round(day * 100) / 100 }
    })

    conn.lastSyncAt = new Date()
    await conn.save()
    return NextResponse.json(out)
  } catch (e) {
    if (e instanceof KiteAuthError) return NextResponse.json({ error: e.message, code: 'KITE_AUTH' }, { status: 409 })
    console.error('kite sync', e)
    return NextResponse.json({ error: 'Could not reach Zerodha' }, { status: 502 })
  }
}
