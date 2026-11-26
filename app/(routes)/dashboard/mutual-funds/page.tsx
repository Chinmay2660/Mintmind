'use client'

import { HoldingsView } from '@/components/wealth/investments/HoldingsView'
import { TabBar } from '@/components/ui/tab-bar'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useEffect, useMemo, useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { MoreVertical, Pencil, RefreshCw, Loader2, Trash2 } from 'lucide-react'
import axios from 'axios'
import { refreshNavs } from '@/lib/market/client'
import { agoLabel, navFreshness } from '@/lib/market/freshness'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addFund, recordSipInstalment, save, remove } from '@/lib/wealth/actions'
import { nextSipDate, portfolioSummary, monthlyEquivalent, toISO } from '@/lib/wealth/calc'
import { cap, formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, LoadingBlock, PageHeader, Progress } from '@/components/wealth/kit'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FundForm, SipForm } from '@/components/wealth/FundForms'
import { cn } from '@/lib/utils'
import { HoldingsTab } from '@/components/wealth/investments/HoldingsTab'
import { PortfolioTab } from '@/components/wealth/investments/PortfolioTab'

/** A SIP is paused, completed (stopped, or all its instalments paid) or otherwise active. */
const sipGroup = (x: any): 'active' | 'paused' | 'completed' => (x.status === 'paused' ? 'paused' : x.status === 'stopped' || (Number(x.instalmentsTotal) > 0 && Number(x.instalmentsCompleted) >= Number(x.instalmentsTotal)) ? 'completed' : 'active')

function MutualFundsTab() {
  const { ready, data, db } = useWealth()
  const [dlg, setDlg] = useState<null | { kind: 'fund' | 'sip' | 'delSip'; row?: any }>(null)
  useAddParam((what) => { if (what === 'fund') setDlg({ kind: 'fund' }) })
  const today = useMemo(() => new Date(), [])
  const [syncing, setSyncing] = useState(false)
  const [mfTab, setMfTab] = useState<'holdings' | 'sips'>('holdings') // like Groww: what you hold, and the SIPs behind it
  const s = useMemo(() => portfolioSummary(data.funds, data.fundTxns, data.sips, today), [data.funds, data.fundTxns, data.sips, today])
  if (!ready) return <LoadingBlock className="h-64" />

  const sips = data.sips.map((x) => ({ ...x, fund: data.funds.find((f) => f.id === x.fundId), next: nextSipDate(x, today) }))
  const shownSips = [...sips].sort((a, b) => ['active', 'paused', 'completed'].indexOf(sipGroup(a)) - ['active', 'paused', 'completed'].indexOf(sipGroup(b)))

  return (
    <div className="space-y-5">
      <PageHeader actions={<><Button variant="outline" disabled={syncing || data.funds.length === 0} onClick={async () => { setSyncing(true); try { const r = await refreshNavs(db, data.funds); if (r.alreadyToday) toast.info('NAVs were already updated today. The next update is tomorrow.'); else if (!r.checked && r.unlinked) toast.info('No fund is linked yet. Open a fund, tap Edit and search for it to link it.'); else toast.success(r.changed ? `${r.changed} ${r.changed === 1 ? 'NAV' : 'NAVs'} updated${r.unlinked ? ` · ${r.unlinked} not linked` : ''}` : 'NAVs are already up to date'); if (r.failed) toast.error(`${r.failed} ${r.failed === 1 ? 'fund' : 'funds'} could not be checked. Try again later.`) } catch (e) { toast.error(axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Could not refresh NAVs. Try again later.') } finally { setSyncing(false) } }}>{syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}Refresh NAVs</Button></>} primaryAction={mfTab === 'sips' ? { label: 'Add SIP', onClick: () => (data.funds.length ? setDlg({ kind: 'sip' }) : toast.info('Add a fund first, then add its SIP.')) } : { label: 'Add fund', onClick: () => setDlg({ kind: 'fund' }) }} />

      <TabBar label="Mutual fund sections" value={mfTab} onChange={(k) => setMfTab(k as 'holdings' | 'sips')} tabs={[{ key: 'holdings', label: 'Holdings', badge: s.fundCount }, { key: 'sips', label: 'SIPs', badge: data.sips.length }]} />

      {mfTab === 'holdings' && <HoldingsView summary={s} funds={data.funds} txns={data.fundTxns} today={today} caption={<NavFreshness funds={data.funds} />} onAdd={() => setDlg({ kind: 'fund' })} />}

      {mfTab === 'sips' && (
        <div className="space-y-5">
          <section aria-label="SIP overview" className="surface-card px-4">
            <dl className="divide-y divide-border text-sm">
              <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Monthly SIP Amount</dt><dd className="font-semibold tabular-nums"><Money value={s.monthlySipCommitment} /></dd></div>
            </dl>
          </section>
          <div>
          {shownSips.length === 0 ? <Empty title="No SIPs" description={data.funds.length ? 'Add a SIP to track commitments.' : 'Add a fund first.'} /> : (
            <ul className="divide-y divide-border">
              {shownSips.map((x) => {
                const total = Number(x.instalmentsTotal) || 0
                const done = Number(x.instalmentsCompleted) || 0
                const per = x.frequency === 'monthly' ? 'month' : x.frequency === 'weekly' ? 'week' : x.frequency === 'quarterly' ? 'quarter' : x.frequency === 'yearly' ? 'year' : String(x.frequency || '')
                const monthly = x.fund && x.status === 'active' ? Math.round(monthlyEquivalent(x)) : 0
                const active = x.status === 'active'
                return (
                  <li key={x.id} className="py-4">
                    {/* one card-like row: who and how much, how far along, what is next, and the one action people use */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{x.fund?.name ?? 'Unknown fund'}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{cap(x.frequency)} · debit day {x.debitDay}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums"><Money value={x.amount} /></p>
                        <p className="text-xs text-muted-foreground">a {per}{monthly && x.frequency !== 'monthly' ? ` · ₹${monthly.toLocaleString('en-IN')}/month` : ''}</p>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="mt-3">
                        <Progress value={Math.min(100, (done / total) * 100)} label={`${done} of ${total} instalments done`} />
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">{done} of {total} done</p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="min-w-0 text-xs text-muted-foreground">
                        <span className={cn('font-medium capitalize', active ? 'text-success' : 'text-muted-foreground')}>{x.status}</span>
                        {x.next ? <> · Next {formatDate(x.next)}</> : null}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        {active && <Button size="sm" variant="outline" onClick={async () => { await recordSipInstalment(db, x.id); toast.success('Instalment recorded at current NAV') }}>Mark paid</Button>}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`More for the ${x.fund?.name ?? 'SIP'} SIP`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDlg({ kind: 'sip', row: x })}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDlg({ kind: 'delSip', row: x })} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          </div>

        </div>
      )}

      {dlg?.kind === 'fund' && <FundForm row={dlg.row} onClose={() => setDlg(null)} onSave={async (r) => { dlg.row ? await save(db, 'funds', r) : await addFund(db, r); toast.success('Fund saved') }} />}
      {dlg?.kind === 'sip' && <SipForm row={dlg.row} funds={data.funds} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'sips', r); toast.success('SIP saved') }} />}
      <ConfirmDialog open={dlg?.kind === 'delSip'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this SIP?" description="Past investments are kept." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'sips', dlg!.row.id); setDlg(null); toast.success('SIP deleted') }} />
    </div>
  )
}

type Tab = 'portfolio' | 'funds' | 'fd' | 'rd' | 'retirement' | 'market' | 'gold' | 'property'
// Allocation first (where it all sits), then a tab for each kind of holding
const TABS: { key: Tab; label: string }[] = [
  { key: 'portfolio', label: 'Allocation' }, { key: 'funds', label: 'Mutual funds' }, { key: 'market', label: 'Stocks & ETFs' }, { key: 'fd', label: 'Fixed deposits' },
  { key: 'rd', label: 'Recurring deposits' }, { key: 'retirement', label: 'EPF, PPF, NPS' }, { key: 'gold', label: 'Gold' }, { key: 'property', label: 'Property & other' },
]

/** Investments: your totals, then a tab for each kind of holding. It opens on the first tab, Allocation. */
export default function InvestmentsPage() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const [tab, setTab] = useState<Tab>('portfolio')
  // a link such as ?tab=fd or ?add=fund lands on that tab (read after mount, so the server and the browser draw the same first screen)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const q = new URLSearchParams(window.location.search); const t = q.get('tab'); if (q.get('add') === 'fund') setTab('funds'); else if (t && TABS.some((x) => x.key === t)) setTab(t as Tab) }, [])
  return (
    <div className="space-y-5">
      <PortfolioTab part="summary" onOpen={() => {}} />
      <TabBar label="Investment sections" tabs={TABS.map((t) => ({ key: t.key, label: t.label }))} value={tab} onChange={(k) => setTab(k as Tab)} />
      {tab === 'portfolio' && <PortfolioTab onOpen={(key) => setTab((key === 'mutualFunds' ? 'funds' : key) as Tab)} />}
      {tab === 'funds' && <MutualFundsTab />}
      {(tab === 'fd' || tab === 'rd' || tab === 'retirement' || tab === 'market' || tab === 'gold' || tab === 'property') && <HoldingsTab key={tab} kind={tab} />}
    </div>
  )
}

/** One line under the holdings heading: the newest NAV date, how many funds look out of date, and when NAVs were last refreshed. */
function NavFreshness({ funds }: { funds: any[] }) {
  const [ago, setAgo] = useState('')
  useEffect(() => { const t = funds.map((f) => f.navFetchedAt).filter(Boolean).sort().pop(); setAgo(t ? agoLabel(t) : '') }, [funds])
  const todayISO = toISO(new Date())
  const dates = funds.map((f) => f.navDate).filter(Boolean).sort()
  const stale = funds.filter((f) => navFreshness(f.navDate, todayISO).stale).length
  if (!dates.length) return null
  return (
    <p className="mb-2 text-xs text-muted-foreground">
      Latest NAV {formatDate(dates[dates.length - 1])}{ago ? ` · refreshed ${ago}` : ''}
      {stale > 0 && <span className="text-warning"> · {stale} {stale === 1 ? 'fund looks' : 'funds look'} out of date. Tap Refresh NAVs, or link the fund in Edit.</span>}
    </p>
  )
}
