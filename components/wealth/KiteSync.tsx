'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Link2 } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { planKiteSync } from '@/lib/wealth/integrations/kite'
import { applyKiteSync } from '@/lib/wealth/integrations/kiteApply'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Money } from './Money'

export interface KiteStatus { configured: boolean; connected: boolean; expired?: boolean; kiteUserName?: string; expiresAt?: string; lastSyncAt?: string; redirectUrl?: string }

export function useKiteStatus() {
  const { isDemo, ready } = useWealth()
  const [status, setStatus] = useState<KiteStatus | null>(null)
  const refresh = useCallback(async () => {
    if (isDemo) return
    try { setStatus((await axios.get('/api/kite/status')).data) } catch { setStatus({ configured: false, connected: false }) }
  }, [isDemo])
  useEffect(() => { if (ready) refresh() }, [ready, refresh])
  return { status, refresh }
}

/** Header actions for Mutual Funds: connect to Zerodha or review & apply a sync (NAVs, SIPs, stocks). */
export function KiteSyncButton() {
  const { isDemo, data, db } = useWealth()
  const { status, refresh } = useKiteStatus()
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [sel, setSel] = useState<any>(null)

  if (isDemo) return null // demo data never touches external services
  if (!status || !status.configured) return null

  const sync = async () => {
    setBusy(true)
    try {
      const { data: payload } = await axios.post('/api/kite/sync', {})
      const p = planKiteSync({ funds: data.funds, sips: data.sips, assets: data.assets }, payload)
      setPlan(p)
      setSel({ nav: new Set(p.navUpdates.map((u: any) => u.fundId)), newFunds: new Set<string>(), newSips: new Set(p.newSips.filter((s: any) => s.fundId).map((s: any) => s.kiteSipId)), sipUpdates: new Set(p.sipUpdates.map((s: any) => s.kiteSipId)), equity: !!p.equity })
      refresh()
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data?.code === 'KITE_AUTH') { toast.error('Zerodha session expired. Log in again.'); refresh() }
      else toast.error('Could not fetch from Zerodha')
    } finally { setBusy(false) }
  }

  const toggle = (k: string, id: string) => setSel((s: any) => { const n = new Set(s[k]); n.has(id) ? n.delete(id) : n.add(id); return { ...s, [k]: n } })
  const nothing = plan && !plan.navUpdates.length && !plan.newFunds.length && !plan.newSips.length && !plan.sipUpdates.length && !plan.equity
  const total = sel ? sel.nav.size + sel.newFunds.size + sel.newSips.size + sel.sipUpdates.size + (sel.equity ? 1 : 0) : 0

  return (
    <>
      {status.connected ? (
        <Button variant="outline" onClick={sync} disabled={busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}Sync from Zerodha</Button>
      ) : (
        <Button variant="outline" asChild><a href="/api/kite/connect"><Link2 className="mr-1.5 h-4 w-4" />{status.expired ? 'Reconnect Zerodha' : 'Connect Zerodha'}</a></Button>
      )}

      <Dialog open={!!plan} onOpenChange={(o) => !o && setPlan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Review Zerodha sync</DialogTitle><DialogDescription>Nothing changes until you apply. NAVs are Kite&apos;s last prices with their own dates.</DialogDescription></DialogHeader>
          {plan && sel && (
            <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1 text-sm">
              {Object.entries(plan.errors).map(([k, v]) => <p key={k} className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">Couldn&apos;t read {k === 'mutualFunds' ? 'mutual funds' : k}: {String(v)}</p>)}
              {nothing && <p className="text-muted-foreground">Everything is already up to date.</p>}

              {plan.navUpdates.length > 0 && <section><h3 className="mb-2 font-semibold">NAV updates ({plan.navUpdates.length})</h3><ul className="space-y-2">{plan.navUpdates.map((u: any) => (
                <li key={u.fundId}><label className="flex items-start gap-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={sel.nav.has(u.fundId)} onChange={() => toggle('nav', u.fundId)} />
                  <span className="min-w-0"><span className="block truncate font-medium">{u.name}</span><span className="text-xs text-muted-foreground">NAV ₹{u.oldNav || '—'} → ₹{u.newNav} ({formatDate(u.navDate)}) · value <Money value={u.newValue} /></span>
                    {u.unitsMismatch && <span className="block text-xs text-warning">Zerodha shows {u.unitsMismatch.kite} units; you have {u.unitsMismatch.mine}. Units are not changed; add investments from your statement if needed.</span>}</span></label></li>))}</ul></section>}

              {plan.newFunds.length > 0 && <section><h3 className="mb-1 font-semibold">Funds not in your list ({plan.newFunds.length})</h3><p className="mb-2 text-xs text-muted-foreground">Imported with Kite&apos;s units and average price. Kite doesn&apos;t give investment dates, so XIRR stays unavailable until you add dated investments.</p><ul className="space-y-2">{plan.newFunds.map((n: any) => (
                <li key={n.symbol}><label className="flex items-start gap-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={sel.newFunds.has(n.symbol)} onChange={() => toggle('newFunds', n.symbol)} /><span className="min-w-0"><span className="block truncate font-medium">{n.name}</span><span className="text-xs text-muted-foreground">{n.units} units · avg ₹{n.averageNav} · NAV ₹{n.nav} · {formatINR(n.units * n.nav)}</span></span></label></li>))}</ul></section>}

              {(plan.newSips.length > 0 || plan.sipUpdates.length > 0) && <section><h3 className="mb-2 font-semibold">SIPs</h3><ul className="space-y-2">
                {plan.newSips.map((s: any) => <li key={s.kiteSipId}><label className="flex items-start gap-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={sel.newSips.has(s.kiteSipId)} onChange={() => toggle('newSips', s.kiteSipId)} /><span className="min-w-0"><span className="block truncate font-medium">New: {s.fundName}</span><span className="text-xs text-muted-foreground">{formatINR(s.amount)} {s.frequency} · {s.status}{!s.fundId ? ' · import its fund first' : ''}</span></span></label></li>)}
                {plan.sipUpdates.map((s: any) => <li key={s.kiteSipId}><label className="flex items-start gap-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={sel.sipUpdates.has(s.kiteSipId)} onChange={() => toggle('sipUpdates', s.kiteSipId)} /><span className="min-w-0"><span className="block truncate font-medium">Update: {s.fundName}</span><span className="text-xs text-muted-foreground">{s.status} · {s.instalmentsCompleted} instalments done</span></span></label></li>)}</ul></section>}

              {plan.equity && <section><h3 className="mb-2 font-semibold">Stocks</h3><label className="flex items-start gap-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={sel.equity} onChange={() => setSel((s: any) => ({ ...s, equity: !s.equity }))} />
                <span><span className="block font-medium">{plan.equity.count} holdings worth {formatINR(plan.equity.value)}</span><span className="text-xs text-muted-foreground">Invested {formatINR(plan.equity.invested)}{plan.equity.dayChange ? ` · today ${plan.equity.dayChange >= 0 ? '+' : ''}${formatINR(plan.equity.dayChange)}` : ''}{plan.equity.previousValue != null ? ` · replaces your current Stocks value of ${formatINR(plan.equity.previousValue)} (not added on top)` : ' · adds a Stocks asset to net worth'}</span></span></label></section>}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPlan(null)}>Close</Button>
            {!nothing && <Button disabled={total === 0} onClick={async () => { const r = await applyKiteSync(db, plan, sel); toast.success(`Applied: ${r.nav} NAVs, ${r.funds} funds, ${r.sips} SIPs${r.equity ? ', stocks' : ''}`); setPlan(null) }}>Apply {total} change{total === 1 ? '' : 's'}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
