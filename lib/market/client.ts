import axios from 'axios'
import { updateNav } from '@/lib/wealth/actions'
import { toISO } from '@/lib/wealth/calc'
import { fundsToRefresh } from './freshness'

// mfapi.in asks for sparing use and publishes one NAV a day, so a fund is looked up at most once a day.
const DAY_KEY = 'mm-navs-day'
const CONCURRENCY = 4

export const pricesDue = () => { try { return localStorage.getItem(DAY_KEY) !== toISO(new Date()) } catch { return false } }

export interface RefreshResult { changed: number; checked: number; failed: number; unlinked: number; alreadyToday: boolean }

/** Fetches the latest NAV of every linked fund not yet looked up today. Only NAV and value change; units, invested amount and history never do. */
export async function refreshNavs(db: any, funds: any[]): Promise<RefreshResult> {
  const today = toISO(new Date())
  const linked = funds.filter((f) => f.schemeCode)
  const due = fundsToRefresh(funds, today)
  const out: RefreshResult = { changed: 0, checked: 0, failed: 0, unlinked: funds.length - linked.length, alreadyToday: linked.length > 0 && due.length === 0 }
  const queue = [...due]
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        const { data } = await axios.get(`/api/mfapi/${encodeURIComponent(f.schemeCode)}`)
        if (!(data.nav > 0)) { out.failed++; continue }
        out.checked++
        // never replace a newer NAV with an older one
        if (!(f.navDate && data.navDate && data.navDate < f.navDate)) {
          const same = Number(f.currentNav) === data.nav && f.navDate === data.navDate
          if (same) await db.funds.update(f.id, { navFetchedAt: new Date().toISOString() })
          else { await updateNav(db, f.id, data.nav, data.navDate || undefined, 'market', { navFetchedAt: new Date().toISOString() }); out.changed++ }
        }
      } catch { out.failed++ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
  if (!out.failed) { try { localStorage.setItem(DAY_KEY, today) } catch { /* ignore */ } }
  return out
}
