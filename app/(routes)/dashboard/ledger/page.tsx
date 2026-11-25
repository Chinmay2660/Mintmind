'use client'

import { cn } from '@/lib/utils'
import { shortAccountName } from '@/lib/wealth/accountName'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { matchesAll } from '@/lib/search'
import { usePagination } from '@/lib/hooks/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/wealth/Money'
import { DateInput, Empty, LoadingBlock, PageHeader, Panel, Select, Stat } from '@/components/wealth/kit'

interface Line { id: string; date: string; account: string; accountId: string; note: string; change: number | null; balance: number }

/**
 * The ledger: every movement on every account, newest first, with money out, money in and the balance after it.
 * It is built from each account's balance history, so it includes everything that touched a balance: transactions,
 * transfers, card payments, SIPs and premiums, with the same balances the accounts show.
 */
export default function LedgerPage() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const { ready, data } = useWealth()
  const [acct, setAcct] = useState('')
  const [kind, setKind] = useState<'all' | 'out' | 'in'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')

  const lines = useMemo<Line[]>(() => {
    const names = new Map<string, string>(data.bankAccounts.map((a: any) => [a.id, shortAccountName(a, data.bankAccounts)]))
    const out: Line[] = []
    for (const a of data.bankAccounts as any[]) {
      const rows = data.balanceHistory.filter((h: any) => h.accountId === a.id).sort((x: any, y: any) => x.date.localeCompare(y.date) || String(x.id).localeCompare(String(y.id)))
      rows.forEach((h: any, i: number) => out.push({ id: h.id, date: h.date, account: names.get(a.id) || 'Account', accountId: a.id, note: h.note || '', change: i === 0 ? null : h.balance - rows[i - 1].balance, balance: h.balance }))
    }
    return out.sort((x, y) => y.date.localeCompare(x.date) || String(y.id).localeCompare(String(x.id)))
  }, [data.bankAccounts, data.balanceHistory])

  const shown = useMemo(() => lines.filter((l) =>
    (!acct || l.accountId === acct) &&
    (kind === 'all' || (kind === 'out' ? (l.change ?? 0) < 0 : (l.change ?? 0) > 0)) &&
    (!from || l.date >= from) && (!to || l.date <= to) &&
    matchesAll(q, l.account, l.note || (l.change == null ? 'opening balance' : 'balance update'), l.date, l.change != null ? Math.abs(l.change) : '', l.balance)), [lines, acct, kind, from, to, q])

  const pg = usePagination(shown, { pageSize: 25, resetKey: `${acct}|${kind}|${from}|${to}|${q}` })
  const totalOut = shown.reduce((n, l) => n + ((l.change ?? 0) < 0 ? -(l.change as number) : 0), 0)
  const totalIn = shown.reduce((n, l) => n + ((l.change ?? 0) > 0 ? (l.change as number) : 0), 0)

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = ['Date,Account,Description,Money out,Money in,Balance', ...shown.map((l) => [l.date, l.account, l.note || (l.change == null ? 'Opening balance' : 'Balance update'), (l.change ?? 0) < 0 ? -(l.change as number) : '', (l.change ?? 0) > 0 ? l.change : '', l.balance].map(esc).join(','))]
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'ledger.csv'; a.click(); URL.revokeObjectURL(url)
  }

  if (!ready) return <LoadingBlock className="h-64" />

  return (
    <div className="space-y-5">
      <PageHeader description="Every movement on every account, with money out, money in and the balance after it. It comes from each account's balance history, so transactions, transfers, card payments, SIPs and premiums are all here."
        actions={<Button variant="outline" onClick={exportCsv} disabled={!shown.length}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 border-b border-border pb-5">
        <Stat label="Entries" value={shown.length} />
        <Stat label="Money out" value={<span className="text-expense"><Money value={totalOut} /></span>} />
        <Stat label="Money in" value={<span className="text-income"><Money value={totalIn} /></span>} />
        <Stat label="Net" value={<Money value={totalIn - totalOut} signed />} />
      </div>

      <div className="grid grid-cols-2 items-end gap-x-3 gap-y-2.5 sm:grid-cols-6 lg:grid-cols-12">
        <div className="relative col-span-2 sm:col-span-6 lg:col-span-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search the ledger" className="h-10 pl-9" placeholder="Search description, account, amount" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-3 lg:col-span-3">Account<Select aria-label="Account" value={acct} onChange={(e) => setAcct(e.target.value)}><option value="">All accounts</option>{data.bankAccounts.map((a: any) => <option key={a.id} value={a.id}>{shortAccountName(a, data.bankAccounts)}</option>)}</Select></label>
        <div className="grid grid-cols-3 rounded-xl border border-border bg-muted p-1 col-span-2 sm:col-span-3 lg:col-span-2">
          {([['all', 'All'], ['out', 'Out'], ['in', 'In']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`min-h-8 rounded-lg px-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring ${kind === k ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground'}`}>{l}</button>)}
        </div>
        <label className="col-span-1 min-w-0 text-xs text-muted-foreground sm:col-span-3 lg:col-span-2">From<div className="mt-0.5"><DateInput aria-label="From date" max={to || undefined} value={from} onChange={(e) => setFrom(e.target.value)} /></div></label>
        <label className="col-span-1 min-w-0 text-xs text-muted-foreground sm:col-span-3 lg:col-span-2">To<div className="mt-0.5"><DateInput aria-label="To date" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)} /></div></label>
        {(acct || kind !== 'all' || from || to || q) && <Button variant="ghost" size="sm" className="col-span-full justify-self-start" onClick={() => { setAcct(''); setKind('all'); setFrom(''); setTo(''); setQ('') }}>Clear</Button>}
      </div>

      <Panel title="Ledger">
        {lines.length === 0 ? <Empty title="Nothing in the ledger yet" description="Add a bank account and record a transaction, and every movement shows up here." /> : shown.length === 0 ? <Empty title="No matches" description="Try a different word, account or dates." /> : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <caption className="sr-only">Ledger entries, newest first</caption>
                <thead className="text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th scope="col" className="pb-2 pr-3 font-bold">Date</th><th scope="col" className="pb-2 pr-3 font-bold">Description</th><th scope="col" className="pb-2 pr-3 font-bold">Account</th><th scope="col" className="pb-2 pr-3 text-right font-bold">Out</th><th scope="col" className="pb-2 pr-3 text-right font-bold">In</th><th scope="col" className="pb-2 text-right font-bold">Balance</th></tr></thead>
                <tbody>
                  {pg.slice.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{formatDate(l.date)}</td>
                      <td className="max-w-[18rem] truncate py-2 pr-3">{l.note || (l.change == null ? 'Opening balance' : 'Balance update')}</td>
                      <td className="max-w-[10rem] truncate py-2 pr-3 text-muted-foreground">{l.account}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-expense">{(l.change ?? 0) < 0 ? <Money value={-(l.change as number)} /> : ''}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-income">{(l.change ?? 0) > 0 ? <Money value={l.change as number} /> : ''}</td>
                      <td className="py-2 text-right font-medium tabular-nums"><Money value={l.balance} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {pg.slice.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{l.note || (l.change == null ? 'Opening balance' : 'Balance update')}</span><span className="block truncate text-xs text-muted-foreground">{formatDate(l.date)} · {l.account}</span></span>
                  <span className="shrink-0 text-right"><span className={cn('block text-sm font-semibold tabular-nums', l.change != null && (l.change > 0 ? 'text-income' : l.change < 0 ? 'text-expense' : ''))}>{l.change == null ? '' : `${l.change > 0 ? '+' : l.change < 0 ? '-' : ''}${formatINR(Math.abs(l.change))}`}</span><span className="block text-xs tabular-nums text-muted-foreground">Bal <Money value={l.balance} /></span></span>
                </li>
              ))}
            </ul>
            <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} from={pg.from} to={pg.to} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} label="Ledger pages" />
          </>
        )}
      </Panel>
    </div>
  )
}
