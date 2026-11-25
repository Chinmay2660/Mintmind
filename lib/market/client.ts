import axios from 'axios'
import { updateNav } from '@/lib/wealth/actions'

const KEY = 'mm-prices-at'
const SYNC_KEY = 'mm-prices-server-sync'

/** When the server last pulled NAVs from the provider (ISO), or null. */
export const lastMarketSync = (): string | null => { try { return localStorage.getItem(SYNC_KEY) } catch { return null } }
const EVERY = 20 * 3600000 // NAVs are published daily

export const pricesDue = () => { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) > EVERY } catch { return false } }

/** Pulls the shared daily NAV cache for these funds and updates only NAV and value. Units and invested amounts are never touched. Returns how many funds changed. */
export async function refreshNavs(db: any, funds: any[]): Promise<number> {
  const eligible = funds.filter((f) => f.navSource !== 'manual-locked')
  if (!eligible.length) return 0
  const { data } = await axios.post('/api/market/prices', { funds: eligible.map((f) => ({ id: f.id, name: f.name, isin: f.isin, symbol: f.symbol, schemeCode: f.schemeCode })) })
  let changed = 0
  for (const p of data.prices as { id: string; nav: number; date: string | null; source: string }[]) {
    const f = funds.find((x) => x.id === p.id)
    // never replace a newer NAV with an older one
    if (!f || !(p.nav > 0) || (f.navDate && p.date && p.date < f.navDate)) continue
    if (Number(f.currentNav) === p.nav && f.navDate === p.date) { await db.funds.update(f.id, { navFetchedAt: new Date().toISOString() }); continue }
    await updateNav(db, f.id, p.nav, p.date || undefined, 'market', { navFetchedAt: new Date().toISOString() })
    changed++
  }
  try { localStorage.setItem(KEY, String(Date.now())); if (data.lastSyncAt) localStorage.setItem(SYNC_KEY, String(data.lastSyncAt)) } catch { /* ignore */ }
  return changed
}
