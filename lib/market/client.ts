import axios from 'axios'
import { updateNav } from '@/lib/wealth/actions'

const KEY = 'mm-prices-at'
const WEEK = 7 * 86400000

export const pricesDue = () => { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) > WEEK } catch { return false } }

/** Pulls the shared weekly NAV cache for these funds and updates only NAV and value. Units and invested amounts are never touched. Returns how many funds changed. */
export async function refreshNavs(db: any, funds: any[]): Promise<number> {
  const eligible = funds.filter((f) => f.navSource !== 'manual-locked')
  if (!eligible.length) return 0
  const { data } = await axios.post('/api/market/prices', { funds: eligible.map((f) => ({ id: f.id, name: f.name, isin: f.isin, symbol: f.symbol, schemeCode: f.schemeCode })) })
  let changed = 0
  for (const p of data.prices as { id: string; nav: number; date: string | null; source: string }[]) {
    const f = funds.find((x) => x.id === p.id)
    // never replace a newer NAV with an older one
    if (!f || !(p.nav > 0) || (f.navDate && p.date && p.date < f.navDate)) continue
    if (Number(f.currentNav) === p.nav && f.navDate === p.date) continue
    await updateNav(db, f.id, p.nav, p.date || undefined, 'market')
    changed++
  }
  try { localStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ }
  return changed
}
