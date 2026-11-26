'use client'

import { HoldingCard, SummaryHeader } from '@/components/wealth/HoldingUI'
import { BackBar } from '@/components/shell/BackBar'
import { TabBar } from '@/components/ui/tab-bar'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { MoreVertical, Pencil, Plus, RefreshCw, Loader2, Trash2 } from 'lucide-react'
import axios from 'axios'
import { refreshNavs } from '@/lib/market/client'
import { agoLabel, navFreshness } from '@/lib/market/freshness'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addFund, recordSipInstalment, save, remove } from '@/lib/wealth/actions'
import { fundMetrics, nextSipDate, portfolioSummary, monthlyEquivalent, toISO } from '@/lib/wealth/calc'
import { cap, formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import { Delta, Empty, Metric, LoadingBlock, PageHeader, Panel, Progress, Select, Stat } from '@/components/wealth/kit'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FundForm, SipForm } from '@/components/wealth/FundForms'
import { cn } from '@/lib/utils'
import { HoldingsTab } from '@/components/wealth/investments/HoldingsTab'
import { PortfolioTab } from '@/components/wealth/investments/PortfolioTab'

function MutualFundsTab() {
  const { ready, data, db } = useWealth()
  const [dlg, setDlg] = useState<null | { kind: 'fund' | 'sip' | 'delSip'; row?: any }>(null)
  useAddParam((what) => { if (what === 'fund') setDlg({ kind: 'fund' }) })
  const today = useMemo(() => new Date(), [])
  const ranked = useMemo(() => data.funds.map((f: any) => ({ f, m: fundMetrics(f, data.fundTxns, today) })).filter((x: any) => x.m.invested > 0).sort((a: any, b: any) => b.m.absReturnPct - a.m.absReturnPct), [data.funds, data.fundTxns, today])
  const [syncing, setSyncing] = useState(false)
  const [fcat, setFcat] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'return' | 'pct'>('name')
  const fundCats = useMemo(() => [...new Set<string>(data.funds.map((f: any) => f.category).filter(Boolean))], [data.funds])
  const visibleFunds = useMemo(() => {
    const rows = data.funds.filter((f: any) => !fcat || f.category === fcat)
    const key: Record<string, (f: any) => number> = { value: (f) => f.currentValue, return: (f) => fundMetrics(f, data.fundTxns, today).absReturn, pct: (f) => fundMetrics(f, data.fundTxns, today).absReturnPct }
    return sortBy === 'name' ? rows : [...rows].sort((a: any, b: any) => key[sortBy](b) - key[sortBy](a))
  }, [data.funds, data.fundTxns, fcat, sortBy, today])
  const pg = usePagination(visibleFunds, { pageSize: 10, resetKey: `${fcat}|${sortBy}` })
  const s = useMemo(() => portfolioSummary(data.funds, data.fundTxns, data.sips, today), [data.funds, data.fundTxns, data.sips, today])
  if (!ready) return <LoadingBlock className="h-64" />

  const sips = data.sips.map((x) => ({ ...x, fund: data.funds.find((f) => f.id === x.fundId), next: nextSipDate(x, today) }))
  const upcoming = sips.filter((x) => x.next).sort((a, b) => a.next!.localeCompare(b.next!))

  return (
    <div className="space-y-5">
      <PageHeader actions={<><Button variant="outline" disabled={syncing || data.funds.length === 0} onClick={async () => { setSyncing(true); try { const r = await refreshNavs(db, data.funds); if (r.alreadyToday) toast.info('NAVs were already updated today. The next update is tomorrow.'); else if (!r.checked && r.unlinked) toast.info('No fund is linked yet. Open a fund, tap Edit and search for it to link it.'); else toast.success(r.changed ? `${r.changed} ${r.changed === 1 ? 'NAV' : 'NAVs'} updated${r.unlinked ? ` · ${r.unlinked} not linked` : ''}` : 'NAVs are already up to date'); if (r.failed) toast.error(`${r.failed} ${r.failed === 1 ? 'fund' : 'funds'} could not be checked. Try again later.`) } catch (e) { toast.error(axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Could not refresh NAVs. Try again later.') } finally { setSyncing(false) } }}>{syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}Refresh NAVs</Button></>} primaryAction={{ label: 'Add fund', onClick: () => setDlg({ kind: 'fund' }) }} />

      <SummaryHeader label="Current value" value={<Money value={s.value} />}
        sub={<span className="flex flex-wrap items-center gap-x-2 text-muted-foreground">1 day change <Metric amount={s.todayGain} compact={false} hint="Needs previous NAV" className="text-sm font-semibold" /></span>}
        stats={[{ label: 'Invested', value: <Money value={s.invested} compact /> }, { label: 'Returns', value: <Metric amount={s.absReturn} className="text-sm font-semibold" /> }, { label: 'Returns %', value: <Metric pct={s.absReturnPct} className="text-sm font-semibold" /> }]} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="XIRR" info="Your annualised return, taking into account when each rupee went in. It describes the past and does not predict future returns. Needs at least two dated cashflows." value={<Metric pct={s.xirrPct} digits={2} hint="Needs at least two dated cashflows" className="text-lg font-semibold sm:text-xl" />} />
        <Stat label="Funds" value={s.fundCount} />
        <Stat label="Active SIPs" value={s.activeSips} />
        <Stat label="Monthly SIP commitment" value={<Money value={s.monthlySipCommitment} />} />
      </div>

      {ranked.length >= 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          {([['Best performing', ranked.slice(0, 3)], ['Lagging', [...ranked].reverse().slice(0, 3)]] as const).map(([title, list]) => (
            <Panel key={title} title={title} description="By absolute return on what you invested">
              <ul className="divide-y divide-border">
                {list.map(({ f, m }: any) => (
                  <li key={f.id}><Link href={`/dashboard/mutual-funds/${f.id}`} className="flex items-center justify-between gap-3 py-2.5 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{f.name}</span><span className="block text-xs text-muted-foreground tabular-nums">Invested {formatINR(m.invested)}</span></span>
                    <Metric amount={m.absReturn} pct={m.absReturnPct} />
                  </Link></li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      <Panel title="Holdings" action={data.funds.length > 1 ? <div className="flex flex-wrap items-center justify-end gap-2"><div className="w-40"><Select aria-label="Fund category" value={fcat} onChange={(e) => setFcat(e.target.value)}><option value="">All categories</option>{fundCats.map((x) => <option key={x}>{x}</option>)}</Select></div><div className="w-40"><Select aria-label="Sort funds" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}><option value="name">Sort: name</option><option value="value">Sort: value</option><option value="return">Sort: return</option><option value="pct">Sort: return %</option></Select></div></div> : undefined}>
        {data.funds.length === 0 ? <Empty title="No mutual funds yet" description="Add a fund manually from your statement." action={<Button onClick={() => setDlg({ kind: 'fund' })}>Add fund</Button>} /> : (
          <>
          <NavFreshness funds={data.funds} />
          <ul className="space-y-3 md:hidden">
            {pg.slice.map((f: any) => {
              const m = fundMetrics(f, data.fundTxns, today)
              return (
                <li key={f.id}>
                  <HoldingCard href={`/dashboard/mutual-funds/${f.id}`} title={f.name} tag={f.category || undefined}
                    figs={[{ label: 'Invested', value: <Money value={m.invested} compact /> }, { label: 'Current', value: <Money value={m.value} compact /> }, { label: 'Returns', value: <Metric amount={m.absReturn} className="text-sm font-semibold" />, sub: <Metric pct={m.absReturnPct} className="text-xs" /> }]} />
                </li>
              )
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-3 font-medium">Fund</th><th className="px-3 text-right font-medium">Invested</th><th className="px-3 text-right font-medium">Value</th><th className="px-3 text-right font-medium">Return</th><th className="px-3 text-right font-medium">XIRR</th><th className="px-3 text-right font-medium">NAV</th></tr></thead>
              <tbody className="divide-y divide-border">
                {pg.slice.map((f: any) => {
                  const m = fundMetrics(f, data.fundTxns, today)
                  return (
                    <tr key={f.id}>
                      <td className="max-w-[18rem] py-3 pr-3"><Link href={`/dashboard/mutual-funds/${f.id}`} className="block truncate font-medium hover:text-primary">{f.name}</Link><span className="text-xs text-muted-foreground">Folio {f.folio}</span></td>
                      <td className="px-3 text-right"><Money value={m.invested} /></td>
                      <td className="px-3 text-right"><Money value={m.value} /></td>
                      <td className="px-3 text-right"><Delta amount={m.absReturn} pct={m.absReturnPct} /></td>
                      <td className="px-3 text-right"><Metric pct={m.xirrPct} hint="Needs at least two dated cashflows" /></td>
                      <td className="px-3 text-right tabular-nums">{f.currentNav}<span className="block text-xs text-muted-foreground">{formatDate(f.navDate)}</span>{navFreshness(f.navDate, toISO(today)).stale && <span className="block text-xs text-warning">May be out of date</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} from={pg.from} to={pg.to} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} label="Holdings pages" />
          </>
        )}
      </Panel>

      <Panel title="SIPs" action={<Button size="sm" variant="outline" disabled={!data.funds.length} onClick={() => setDlg({ kind: 'sip' })}><Plus className="mr-1 h-4 w-4" />Add SIP</Button>}>
        {sips.length === 0 ? <Empty title="No SIPs" description={data.funds.length ? 'Add a SIP to track commitments.' : 'Add a fund first.'} /> : (
          <ul className="divide-y divide-border">
            {sips.map((x) => {
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
        {upcoming.length > 0 && <p className="mt-1 border-t border-border pt-3 text-xs text-muted-foreground">Next SIP: {upcoming[0].fund?.name} on {formatDate(upcoming[0].next!)}</p>}
      </Panel>

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
      <BackBar phoneOnly />
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
