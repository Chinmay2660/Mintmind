import { NextResponse } from 'next/server'
import { isCronAuthorised } from '@/lib/market/auth'
import { syncMarket } from '@/lib/market/sync'

/**
 * Internal. Run once a week by a scheduler (cron-job.org, GitHub Actions, Vercel Cron):
 *   GET /api/internal/market-sync   with   Authorization: Bearer $CRON_SECRET
 * Refreshes the shared NAV/price cache. Never exposed to end users.
 */
export async function GET(request) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { return NextResponse.json(await syncMarket()) } catch (e) { console.error('market sync', e); return NextResponse.json({ error: 'Sync failed' }, { status: 500 }) }
}
export const POST = GET
