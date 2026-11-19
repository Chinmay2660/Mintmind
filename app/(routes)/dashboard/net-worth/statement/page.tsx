'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { useAuth } from '@/lib/hooks/useAuth'
import { buildStatement } from '@/lib/wealth/statement'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { toISO } from '@/lib/wealth/calc'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingBlock } from '@/components/wealth/kit'

// a document is dark text on white paper whichever theme the app is in, on screen and when printed
const PAPER = { '--background': '0 0% 100%', '--foreground': '0 0% 9%', '--card': '0 0% 100%', '--muted-foreground': '0 0% 32%', '--border': '0 0% 78%' } as React.CSSProperties

/** A net worth statement to sign: assets and liabilities as of today, with space for a signature. It is self-declared, not an audit. */
export default function StatementPage() {
  const { ready, data, isDemo } = useWealth()
  const { user } = useAuth()
  const [detailed, setDetailed] = useState(true)
  const today = useMemo(() => new Date(), [])
  const s = useMemo(() => buildStatement({ bankAccounts: data.bankAccounts as any[], funds: data.funds as any[], assets: data.assets as any[], liabilities: data.liabilities as any[], cards: data.cards as any[], detailed, today }), [data, detailed, today])
  if (!ready) return <LoadingBlock className="h-72" />
  const profile = data.meta.find((m: any) => m.key === 'profile')?.value
  const name = profile?.name || user?.name || ''

  const Section = ({ title, groups, total }: { title: string; groups: typeof s.assets; total: number }) => (
    <section className="mt-6 break-inside-avoid">
      <h2 className="border-b-2 border-foreground pb-1 text-sm font-bold uppercase tracking-wide">{title}</h2>
      {groups.length === 0 ? <p className="py-2 text-sm text-muted-foreground">None recorded.</p> : (
        <table className="w-full text-sm">
          <tbody>
            {groups.map((g) => (
              <tr key={g.name} className="align-top">
                <td className="py-1.5 pr-3">
                  {detailed ? <><span className="font-semibold">{g.name}</span>{g.items.map((r, i) => <span key={i} className="block pl-3 text-muted-foreground">{r.label}</span>)}</> : <span>{g.name}</span>}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {detailed ? <><span className="block font-semibold">{formatINR(g.total)}</span>{g.items.map((r, i) => <span key={i} className="block text-muted-foreground">{formatINR(r.value)}</span>)}</> : formatINR(g.total)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border font-bold"><td className="py-2">Total {title.toLowerCase()}</td><td className="py-2 text-right tabular-nums">{formatINR(total)}</td></tr>
          </tbody>
        </table>
      )}
    </section>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/net-worth" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Net worth</Link>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={detailed} onChange={(e) => setDetailed(e.target.checked)} aria-label="List every account and holding" />List every account and holding</label>
          <Button onClick={() => { const prev = document.title; document.title = `net-worth-statement-${toISO(today)}`; window.addEventListener('afterprint', () => { document.title = prev }, { once: true }); window.print() }}><Printer className="mr-1.5 h-4 w-4" />Print or save as PDF</Button>
        </div>
      </div>

      <article style={PAPER} className="mx-auto max-w-3xl rounded-lg border border-border bg-background p-6 text-foreground shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none" aria-label="Net worth statement">
        <header>
          <h1 className="text-2xl font-bold">Statement of net worth</h1>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Name</dt><dd className="font-medium">{name || '____________________'}</dd>
            <dt className="text-muted-foreground">As on</dt><dd className="font-medium">{formatDate(toISO(today))}</dd>
            <dt className="text-muted-foreground">Currency</dt><dd className="font-medium">Indian rupees (₹)</dd>
          </dl>
        </header>

        <Section title="Assets" groups={s.assets} total={s.totalAssets} />
        <Section title="Liabilities" groups={s.liabilities} total={s.totalLiabilities} />

        <section className="mt-6 break-inside-avoid border-y-2 border-foreground py-3">
          <div className="flex items-baseline justify-between text-base font-bold"><span>Net worth (assets minus liabilities)</span><span className="tabular-nums">{formatINR(s.netWorth)}</span></div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          {isDemo ? 'This is sample data from a demo account. ' : ''}This statement is prepared from the figures the person entered or imported into Mintmind, with the latest values they recorded. It has not been audited or verified by any third party, and property and similar assets are shown at the value entered, not a valuation. It is a self-declaration and not a chartered accountant&apos;s certificate.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-10 break-inside-avoid text-sm">
          <div><div className="h-14 border-b border-foreground" /><p className="mt-1">Signature of the person</p><p className="text-muted-foreground">Date: ______________</p></div>
          <div><div className="h-14 border-b border-foreground" /><p className="mt-1">Signature and stamp of the chartered accountant, if certified</p><p className="text-muted-foreground">Membership no.: ______________</p></div>
        </div>
      </article>
    </div>
  )
}
