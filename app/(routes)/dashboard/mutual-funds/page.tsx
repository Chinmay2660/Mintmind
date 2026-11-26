'use client'

import { HoldingsView } from '@/components/wealth/investments/HoldingsView'
import { TabBar } from '@/components/ui/tab-bar'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useEffect, useMemo, useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { MoreVertical, Pencil, RefreshCw, Loader2, Trash2 } from 'lucide-react'
import axios from 'axios'
import { refreshNavs, pricesDue } from '@/lib/market/client'
import { agoLabel, navFreshness } from '@/lib/market/freshness'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addFund, recordSipInstalment, save, remove } from '@/lib/wealth/actions'
import { nextSipDate, portfolioSummary, monthlyEquivalent, sipPaidThisCycle, toISO, istNow } from '@/lib/wealth/calc'
import { cap, formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, LoadingBlock, PageHeader } from '@/components/wealth/kit'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FundForm, SipForm } from '@/components/wealth/FundForms'
import { HoldingsTab } from '@/components/wealth/investments/HoldingsTab'
import { PortfolioTab } from '@/components/wealth/investments/PortfolioTab'

function MutualFundsTab() {
  const { ready, data, db } = useWealth()
  const [dlg, setDlg] = useState<null | { kind: 'fund' | 'sip' | 'delSip'; row?: any }>(null)
  useAddParam((what) => { if (what === 'fund') setDlg({ kind: 'fund' }) })
  const today = useMemo(() => istNow(), [])
  const [syncing, setSyncing] = useState(false)
  const [navsDone, setNavsDone] = useState(false) // NAVs are looked up once a day; the button comes back tomorrow
  useEffect(() => { setNavsDone(!pricesDue()) }, [])
  const [mfTab, setMfTab] = useState<'holdings' | 'sips'>('holdings') // like Groww: what you hold, and the SIPs behind it
  const s = useMemo(() => portfolioSummary(data.funds, data.fundTxns, data.sips, today), [data.funds, data.fundTxns, data.sips, today])
  if (!ready) return <LoadingBlock className="h-64" />

  const sips = data.sips.map((x) => ({ ...x, fund: data.funds.find((f) => f.id === x.fundId), next: nextSipDate(x, today) }))

  return (
    <div className="space-y-5">
      <PageHeader actions={<><Button variant="outline" disabled={syncing || navsDone || data.funds.length === 0} onClick={async () => { setSyncing(true); try { const r = await refreshNavs(db, data.funds); if (r.alreadyToday) toast.info('NAVs were already updated today. The next update is tomorrow.'); else if (!r.checked && r.unlinked) toast.info('No fund is linked yet. Open a fund, tap Edit and search for it to link it.'); else toast.success(r.changed ? `${r.changed} ${r.changed === 1 ? 'NAV' : 'NAVs'} updated${r.unlinked ? ` · ${r.unlinked} not linked` : ''}` : 'NAVs are already up to date'); if (r.failed) toast.error(`${r.failed} ${r.failed === 1 ? 'fund' : 'funds'} could not be checked. Try again later.`) } catch (e) { toast.error(axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Could not refresh NAVs. Try again later.') } finally { setSyncing(false); setNavsDone(!pricesDue()) } }}>{syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}{navsDone ? 'NAVs updated today' : 'Refresh NAVs'}</Button></>} primaryAction={mfTab === 'sips' ? { label: 'Add SIP', onClick: () => (data.funds.length ? setDlg({ kind: 'sip' }) : toast.info('Add a fund first, then add its SIP.')) } : { label: 'Add fund', onClick: () => setDlg({ kind: 'fund' }) }} />

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
          {sips.length === 0 ? <Empty title="No SIPs" description={data.funds.length ? 'Add a SIP to track commitments.' : 'Add a fund first.'} /> : (
            <ul className="divide-y divide-border border-y border-border">
              {sips.map((x) => {
                const per = x.frequency === 'monthly' ? 'month' : x.frequency === 'weekly' ? 'week' : x.frequency === 'quarterly' ? 'quarter' : x.frequency === 'yearly' ? 'year' : String(x.frequency || '')
                const monthly = x.fund && x.status === 'active' ? Math.round(monthlyEquivalent(x)) : 0
                const active = x.status === 'active'
                const paid = sipPaidThisCycle(x, today)
                return (
                  <li key={x.id} className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">{x.fund?.name ?? 'Unknown fund'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-semibold tabular-nums"><Money value={x.amount} /></p>
                        <p className="text-xs text-muted-foreground">{cap(x.frequency)}{monthly && x.frequency !== 'monthly' ? ` · ₹${monthly.toLocaleString('en-IN')} a month` : ''}</p>
                      </div>
                    </div>
                    {/* the date of the next debit is what people look for, so it leads; weekends and bank holidays are not worked out, the date is the one set on the SIP */}
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-accent/60 px-3 py-2">
                      <div><p className="text-xs text-muted-foreground">Next debit</p><p className="text-base font-semibold tabular-nums text-primary">{paid ? 'Paid for this ' + per : x.next ? formatDate(x.next) : '-'}</p></div>
                      <div className="flex items-center gap-1">
                        {active && !paid && <Button size="sm" onClick={async () => { try { await recordSipInstalment(db, x.id); toast.success('Instalment recorded at current NAV') } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not record the instalment') } }}>Mark paid</Button>}
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

type Tab = 'portfolio' | 'funds' | 'market' | 'fd' | 'rd' | 'epf' | 'ppf' | 'nps' | 'gold' | 'esop' | 'realEstate' | 'vehicle' | 'other'
// Allocation first (where it all sits), then a tab for each kind of holding, in the order a person thinks of them
const TABS: { key: Tab; label: string }[] = [
  { key: 'portfolio', label: 'Allocation' }, { key: 'funds', label: 'Mutual funds' }, { key: 'market', label: 'Stocks and ETFs' }, { key: 'fd', label: 'Fixed deposits' },
  { key: 'rd', label: 'Recurring deposits' }, { key: 'epf', label: 'EPF' }, { key: 'ppf', label: 'PPF' }, { key: 'nps', label: 'NPS' }, { key: 'gold', label: 'Gold' },
  { key: 'esop', label: 'ESOPs/RSUs' }, { key: 'realEstate', label: 'Real estate' }, { key: 'vehicle', label: 'Vehicle' }, { key: 'other', label: 'Other assets' },
]
// links made before the tabs were split still land somewhere sensible
const TAB_ALIAS: Record<string, Tab> = { retirement: 'epf', property: 'realEstate' }

/** Investments: your totals, then a tab for each kind of holding. It opens on the first tab, Allocation. */
export default function InvestmentsPage() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const [tab, setTab] = useState<Tab>('portfolio')
  const { data } = useWealth()
  const hasOther = (data.assets as any[]).some((a) => a.category === 'other') // the catch-all tab only exists when something is in it
  // a link such as ?tab=fd or ?add=fund lands on that tab (read after mount, so the server and the browser draw the same first screen)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const q = new URLSearchParams(window.location.search); const t = q.get('tab'); if (q.get('add') === 'fund') setTab('funds'); else if (t && TAB_ALIAS[t]) setTab(TAB_ALIAS[t]); else if (t && TABS.some((x) => x.key === t)) setTab(t as Tab) }, [])
  return (
    <div className="space-y-5">
      <PortfolioTab part="summary" onOpen={() => {}} />
      <TabBar label="Investment sections" tabs={TABS.filter((t) => t.key !== 'other' || hasOther || tab === 'other').map((t) => ({ key: t.key, label: t.label }))} value={tab} onChange={(k) => setTab(k as Tab)} />
      {tab === 'portfolio' && <PortfolioTab onOpen={(key) => setTab((key === 'mutualFunds' ? 'funds' : key) as Tab)} />}
      {tab === 'funds' && <MutualFundsTab />}
      {tab !== 'portfolio' && tab !== 'funds' && <HoldingsTab key={tab} kind={tab} />}
    </div>
  )
}

/** One line under the holdings heading: the newest NAV date, how many funds look out of date, and when NAVs were last refreshed. */
function NavFreshness({ funds }: { funds: any[] }) {
  const [ago, setAgo] = useState('')
  useEffect(() => { const t = funds.map((f) => f.navFetchedAt).filter(Boolean).sort().pop(); setAgo(t ? agoLabel(t) : '') }, [funds])
  const todayISO = toISO(istNow())
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
