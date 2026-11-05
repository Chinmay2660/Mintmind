'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addFund, recordSipInstalment, save, remove, updateNav } from '@/lib/wealth/actions'
import { fundMetrics, nextSipDate, portfolioSummary, monthlyEquivalent } from '@/lib/wealth/calc'
import { cap, formatDate, formatPct } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Delta, Empty, LoadingBlock, PageHeader, Panel, Stat } from '@/components/wealth/kit'
import { KiteSyncButton } from '@/components/wealth/KiteSync'
import { FundForm, NavForm, SipForm } from '@/components/wealth/FundForms'

export default function MutualFundsPage() {
  const { ready, data, db } = useWealth()
  const [dlg, setDlg] = useState<null | { kind: 'fund' | 'nav' | 'sip' | 'delSip'; row?: any }>(null)
  const today = useMemo(() => new Date(), [])
  // result of the Zerodha login redirect (?kite=connected|denied|failed|invalid_state|unconfigured)
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('kite')
    if (!k) return
    const m: Record<string, string> = { connected: 'Zerodha connected. Use “Sync from Zerodha”.', denied: 'Zerodha login was cancelled.', failed: 'Zerodha login failed. Check the API key/secret and redirect URL.', invalid_state: 'Zerodha login could not be verified. Try again.', unconfigured: 'Zerodha is not configured on this server.' }
    k === 'connected' ? toast.success(m[k]) : toast.error(m[k] ?? 'Zerodha login failed')
    window.history.replaceState(null, '', window.location.pathname)
  }, [])
  const s = useMemo(() => portfolioSummary(data.funds, data.fundTxns, data.sips, today), [data.funds, data.fundTxns, data.sips, today])
  if (!ready) return <LoadingBlock className="h-64" />

  const sips = data.sips.map((x) => ({ ...x, fund: data.funds.find((f) => f.id === x.fundId), next: nextSipDate(x, today) }))
  const upcoming = sips.filter((x) => x.next).sort((a, b) => a.next!.localeCompare(b.next!))

  return (
    <div className="space-y-5">
      <PageHeader description="Update NAVs manually from your statements or sync them from Zerodha. Returns use true dated cashflows (XIRR)." actions={<><KiteSyncButton /><Button onClick={() => setDlg({ kind: 'fund' })}><Plus className="mr-1.5 h-4 w-4" />Add fund</Button></>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invested" value={<Money value={s.invested} />} />
        <Stat label="Current value" value={<Money value={s.value} />} />
        <Stat label="Absolute return" value={<span className={s.absReturn >= 0 ? 'text-success' : 'text-destructive'}><Money value={s.absReturn} /></span>} hint={formatPct(s.absReturnPct)} />
        <Stat label="XIRR" value={s.xirrPct == null ? '—' : formatPct(s.xirrPct)} hint="Annualised, dated cashflows" />
        <Stat label="Today's gain / loss" value={s.todayGain == null ? '—' : <Money value={s.todayGain} signed />} hint={s.todayGain == null ? 'Needs previous NAV' : undefined} />
        <Stat label="Funds" value={s.fundCount} />
        <Stat label="Active SIPs" value={s.activeSips} />
        <Stat label="Monthly SIP commitment" value={<Money value={s.monthlySipCommitment} />} />
      </div>

      <Panel title="Holdings">
        {data.funds.length === 0 ? <Empty title="No mutual funds yet" description="Add a fund manually from your statement." action={<Button onClick={() => setDlg({ kind: 'fund' })}>Add fund</Button>} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-3 font-medium">Fund</th><th className="px-3 text-right font-medium">Invested</th><th className="px-3 text-right font-medium">Value</th><th className="px-3 text-right font-medium">Return</th><th className="px-3 text-right font-medium">XIRR</th><th className="px-3 text-right font-medium">NAV</th><th className="pl-3" /></tr></thead>
              <tbody className="divide-y divide-border">
                {data.funds.map((f) => {
                  const m = fundMetrics(f, data.fundTxns, today)
                  return (
                    <tr key={f.id}>
                      <td className="max-w-[18rem] py-3 pr-3"><Link href={`/dashboard/mutual-funds/${f.id}`} className="block truncate font-medium hover:text-primary">{f.name}</Link><span className="text-xs text-muted-foreground">Folio {f.folio}</span></td>
                      <td className="px-3 text-right"><Money value={m.invested} /></td>
                      <td className="px-3 text-right"><Money value={m.value} /></td>
                      <td className="px-3 text-right"><Delta amount={m.absReturn} pct={m.absReturnPct} /></td>
                      <td className="px-3 text-right">{m.xirrPct == null ? '—' : formatPct(m.xirrPct, 1)}</td>
                      <td className="px-3 text-right tabular-nums">{f.currentNav}<span className="block text-xs text-muted-foreground">{formatDate(f.navDate)}</span></td>
                      <td className="pl-3 text-right"><Button size="sm" variant="outline" onClick={() => setDlg({ kind: 'nav', row: f })}><RefreshCw className="mr-1 h-3.5 w-3.5" />NAV</Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="SIPs" description="Commitment, upcoming debits and status" action={<Button size="sm" variant="outline" disabled={!data.funds.length} onClick={() => setDlg({ kind: 'sip' })}><Plus className="mr-1 h-4 w-4" />Add SIP</Button>}>
        {sips.length === 0 ? <Empty title="No SIPs" description={data.funds.length ? 'Add a SIP to track commitments.' : 'Add a fund first.'} /> : (
          <ul className="divide-y divide-border">
            {sips.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{x.fund?.name ?? 'Unknown fund'}</p>
                  <p className="text-xs text-muted-foreground"><Money value={x.amount} /> · {cap(x.frequency)} · Debit day {x.debitDay} · {x.instalmentsCompleted}/{x.instalmentsTotal || '∞'} done · <span className="capitalize">{x.status}</span>{x.next ? ` · Next ${formatDate(x.next)}` : ''}{x.fund && x.status === 'active' ? ` · ₹${Math.round(monthlyEquivalent(x)).toLocaleString('en-IN')}/month` : ''}</p></div>
                <div className="flex gap-2">
                  {x.status === 'active' && <Button size="sm" variant="outline" onClick={async () => { await recordSipInstalment(db, x.id); toast.success('Instalment recorded at current NAV') }}>Mark paid</Button>}
                  <Button size="sm" variant="outline" onClick={() => setDlg({ kind: 'sip', row: x })}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDlg({ kind: 'delSip', row: x })}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {upcoming.length > 0 && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Next SIP: {upcoming[0].fund?.name} on {formatDate(upcoming[0].next!)}</p>}
      </Panel>

      {dlg?.kind === 'fund' && <FundForm row={dlg.row} onClose={() => setDlg(null)} onSave={async (r) => { dlg.row ? await save(db, 'funds', r) : await addFund(db, r); toast.success('Fund saved') }} />}
      {dlg?.kind === 'nav' && <NavForm fund={dlg.row} onClose={() => setDlg(null)} onSave={async (nav, date) => { await updateNav(db, dlg.row.id, nav, date); toast.success('NAV updated') }} />}
      {dlg?.kind === 'sip' && <SipForm row={dlg.row} funds={data.funds} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'sips', r); toast.success('SIP saved') }} />}
      <ConfirmDialog open={dlg?.kind === 'delSip'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this SIP?" description="Past investments are kept." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'sips', dlg!.row.id); setDlg(null); toast.success('SIP deleted') }} />
    </div>
  )
}
