import connectDB from '@/lib/mongodb'
import MarketPrice from '@/models/MarketPrice'
import MarketMeta from '@/models/MarketMeta'
import { KiteAuthError, kiteGet, kiteGetText } from '@/lib/kite/client'
import { getAppToken } from './session'
import { parseAmfi, parseKiteLtp, parseKiteMfCsv } from './parsers'

const AMFI_URL = 'https://www.amfiindia.com/spages/NAVAll.txt'

async function upsert(rows) {
  if (!rows.length) return 0
  const ops = rows.map((r) => {
    const key = r.kind === 'equity' ? `eq:${r.symbol}` : `mf:${r.source}:${r.schemeCode || r.symbol}`
    return { updateOne: { filter: { key }, update: { $set: { ...r, key } }, upsert: true } }
  })
  for (let i = 0; i < ops.length; i += 1000) await MarketPrice.bulkWrite(ops.slice(i, i + 1000), { ordered: false })
  return rows.length
}

/**
 * Weekly price refresh. Always pulls the public AMFI NAV file (no login needed). When the app's Kite session is
 * valid it also pulls Kite's mutual fund list and last prices for the equity watchlist (MARKET_EQUITY_SYMBOLS, e.g.
 * "NSE:NIFTYBEES,NSE:RELIANCE"). Each source fails on its own, so one outage never blocks the others.
 */
export async function syncMarket() {
  await connectDB()
  const result = { at: new Date().toISOString(), amfi: null, kiteMf: null, equity: null, kite: 'not_configured', errors: {} }

  try {
    const res = await fetch(AMFI_URL, { headers: { 'User-Agent': 'Mintmind price sync' } })
    if (!res.ok) throw new Error(`AMFI responded ${res.status}`)
    result.amfi = await upsert(parseAmfi(await res.text()))
  } catch (e) { result.errors.amfi = e.message }

  if (process.env.KITE_API_KEY && process.env.KITE_API_SECRET) {
    const token = await getAppToken()
    if (!token) result.kite = 'login_required'
    else {
      result.kite = 'ok'
      try { result.kiteMf = await upsert(parseKiteMfCsv(await kiteGetText(token, '/mf/instruments'))) } catch (e) { if (e instanceof KiteAuthError) result.kite = 'login_required'; else result.errors.kiteMf = e.message }
      const symbols = (process.env.MARKET_EQUITY_SYMBOLS || '').split(',').map((s) => s.trim()).filter(Boolean)
      if (symbols.length && result.kite === 'ok') {
        try { result.equity = await upsert(parseKiteLtp(await kiteGet(token, `/quote/ltp?${symbols.map((s) => `i=${encodeURIComponent(s)}`).join('&')}`))) } catch (e) { if (e instanceof KiteAuthError) result.kite = 'login_required'; else result.errors.equity = e.message }
      }
    }
  }

  await MarketMeta.findOneAndUpdate({ key: 'sync' }, { key: 'sync', lastSyncAt: new Date(), lastResult: result }, { upsert: true })
  return result
}
