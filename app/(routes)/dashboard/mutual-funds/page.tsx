'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { Plus, RefreshCw, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addFund, recordSipInstalment, save, remove, updateNav } from '@/lib/wealth/actions'
import { fundMetrics, nextSipDate, portfolioSummary, monthlyEquivalent } from '@/lib/wealth/calc'
import { cap, formatDate, formatINR, formatPct } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import { Delta, Empty, Metric, LoadingBlock, PageHeader, Panel, Select, Stat } from '@/components/wealth/kit'
import { StatementImportButton } from '@/components/wealth/StatementImport'
import { FundForm, NavForm, SipForm } from '@/components/wealth/FundForms'
import { PdfStatementImport } from '@/components/wealth/PdfStatementImport'
import { TabBar } from '@/components/ui/tab-bar'
import { HoldingsTab } from '@/components/wealth/investments/HoldingsTab'
import { PortfolioTab } from '@/components/wealth/investments/PortfolioTab'

function MutualFundsTab() {
  const { ready, data, db } = useWealth()
  const [dlg, setDlg] = useState<null | { kind: 'fund' | 'nav' | 'sip' | 'delSip'; row?: any }>(null)
  useAddParam((what) => { if (what === 'fund') setDlg({ kind: 'fund' }) })
  const today = useMemo(() => new Date(), [])
  const ranked = useMemo(() => data.funds.map((f: any) => ({ f, m: fundMetrics(f, data.fundTxns, today) })).filter((x: any) => x.m.invested > 0).sort((a: any, b: any) => b.m.absReturnPct - a.m.absReturnPct), [data.funds, data.fundTxns, today])
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
      <PageHeader actions={<><StatementImportButton /><PdfStatementImport /></>} primaryAction={{ label: 'Add fund', onClick: () => setDlg({ kind: 'fund' }) }} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 border-b border-border pb-5">
        <Stat label="Invested" info="Total money you have put in across all funds, including lump sums and SIP instalments." value={<Money value={s.invested} />} />
        <Stat label="Current value" info="Units you hold multiplied by each fund's latest NAV." value={<Money value={s.value} />} />
        <Stat label="Absolute return" info="Gain or loss compared with what you invested. It ignores how long the money was invested, so use XIRR to compare over time." value={<Metric amount={s.absReturn} pct={s.absReturnPct} className="text-lg font-semibold sm:text-xl" />} />
        <Stat label="XIRR" info="Your annualised return, taking into account when each rupee went in. It describes the past and does not predict future returns. Needs at least two dated cashflows." value={<Metric pct={s.xirrPct} digits={2} hint="Needs at least two dated cashflows" className="text-lg font-semibold sm:text-xl" />} />
        <Stat label="Today's gain / loss" info="Change in value since the previous NAV. Shows a dash until a previous NAV is known." value={<Metric amount={s.todayGain} compact={false} hint="Needs previous NAV" className="text-lg font-semibold sm:text-xl" />} />
        <Stat label="Funds" info="Number of mutual fund holdings you track." value={s.fundCount} />
        <Stat label="Active SIPs" info="SIPs that are running now and will debit on their next due date." value={s.activeSips} />
        <Stat label="Monthly SIP commitment" info="Total of all active SIP instalments in a month." value={<Money value={s.monthlySipCommitment} />} />
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
          <ul className="space-y-2 md:hidden">
            {pg.slice.map((f: any) => {
              const m = fundMetrics(f, data.fundTxns, today)
              return (
                <li key={f.id}>
                  <Link href={`/dashboard/mutual-funds/${f.id}`} className="surface-card flex items-center gap-3 p-4 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="mt-1 block text-lg font-semibold tabular-nums"><Money value={m.value} /></span>
                    </span>
                    <Delta pill amount={m.absReturn} pct={m.absReturnPct} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-3 font-medium">Fund</th><th className="px-3 text-right font-medium">Invested</th><th className="px-3 text-right font-medium">Value</th><th className="px-3 text-right font-medium">Return</th><th className="px-3 text-right font-medium">XIRR</th><th className="px-3 text-right font-medium">NAV</th><th className="pl-3" /></tr></thead>
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
                      <td className="px-3 text-right tabular-nums">{f.currentNav}<span className="block text-xs text-muted-foreground">{formatDate(f.navDate)}</span></td>
                      <td className="pl-3 text-right"><Button size="sm" variant="outline" onClick={() => setDlg({ kind: 'nav', row: f })}><RefreshCw className="mr-1 h-3.5 w-3.5" />NAV</Button></td>
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

type Tab = 'portfolio' | 'funds' | 'fd' | 'rd' | 'retirement' | 'market' | 'gold'
const TABS: { key: Tab; label: string }[] = [
  { key: 'portfolio', label: 'Portfolio' }, { key: 'funds', label: 'Mutual funds' }, { key: 'fd', label: 'Fixed deposits' }, { key: 'rd', label: 'Recurring deposits' },
  { key: 'retirement', label: 'EPF, PPF, NPS' }, { key: 'market', label: 'Stocks & ETFs' }, { key: 'gold', label: 'Gold' },
]

/** Investments: the whole portfolio, and a section for each kind of holding. Property, vehicles and loans live under Net worth. */
export default function InvestmentsPage() {
  const [tab, setTab] = useState<Tab>('portfolio')
  // a link such as ?add=fund lands on the section that can add it
  // the address is read after mount so the server and the browser draw the same first screen
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (new URLSearchParams(window.location.search).get('add') === 'fund') setTab('funds') }, [])
  return (
    <div className="space-y-5">
      <TabBar label="Investment sections" tabs={TABS} value={tab} onChange={(k) => setTab(k as Tab)} />
      {tab === 'portfolio' && <PortfolioTab onOpen={(key) => setTab((key === 'mutualFunds' ? 'funds' : key) as Tab)} />}
      {tab === 'funds' && <MutualFundsTab />}
      {(tab === 'fd' || tab === 'rd' || tab === 'retirement' || tab === 'market' || tab === 'gold') && <HoldingsTab key={tab} kind={tab} />}
    </div>
  )
}
