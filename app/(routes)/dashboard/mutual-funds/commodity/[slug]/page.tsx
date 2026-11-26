'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { save } from '@/lib/wealth/actions'
import { commoditySlug, commodityType } from '@/lib/wealth/portfolio'
import { assetGain, assetValue } from '@/lib/wealth/holdings'
import { istNow } from '@/lib/wealth/calc'
import { formatDate } from '@/lib/wealth/format'
import { returnTotals } from '@/lib/wealth/holdingsTotals'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/wealth/Money'
import { AssetForm } from '@/components/wealth/AssetForm'
import { Empty, LoadingBlock, Metric, Panel } from '@/components/wealth/kit'
import { SummaryHeader } from '@/components/wealth/HoldingUI'

/** One commodity (Gold, Silver...) on its own page: what you hold of it in all, then each purchase, with where it was bought. */
export default function CommodityDetail() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { ready, data, db } = useWealth()
  const today = useMemo(() => istNow(), [])
  const [form, setForm] = useState(false)
  const lots = useMemo(() => (data.assets as any[]).filter((a) => (a.category === 'gold' || a.category === 'commodity') && commoditySlug(commodityType(a)) === slug).sort((a, b) => String(b.purchaseDate || b.updated).localeCompare(String(a.purchaseDate || a.updated))), [data.assets, slug])
  const type = lots[0] ? commodityType(lots[0]) : String(slug).replace(/-/g, ' ')
  const back = '/dashboard/mutual-funds?tab=gold'
  useDetailCrumb(lots.length ? type : null, () => router.push(back))
  if (!ready) return <LoadingBlock className="h-64" />
  if (!lots.length && !form) return <Empty title="Nothing here" action={<Link className="text-primary underline" href={back}>Go to commodities</Link>} />
  const t = returnTotals(lots.map((x) => { const g = assetGain(x, today); return { value: assetValue(x, today), gain: g ? g.gain : null } }))
  return (
    <div className="space-y-5">
      <div className="min-w-0"><p className="text-sm text-muted-foreground">{lots.length} {lots.length === 1 ? 'purchase' : 'purchases'}</p></div>
      <Button className="w-full sm:w-auto" onClick={() => setForm(true)}><Plus className="mr-1.5 h-4 w-4" />Add purchase</Button>
      <SummaryHeader label="Current value" value={<Money value={t.value} />} stats={t.gain != null ? [{ label: 'Invested', value: <Money value={t.value - t.gain} /> }, { label: 'Returns', value: <Metric arrow={false} amount={t.gain} pct={t.pct} compact={false} className="text-sm font-semibold" /> }] : []} />
      <Panel flat title={`Purchases (${lots.length})`}>
        <ul className="divide-y divide-border border-y border-border">
          {lots.map((a) => {
            const v = assetValue(a, today), g = assetGain(a, today)
            const where = a.buyForm === 'Digital' ? 'Digital' : a.boughtFrom ? `Physical · ${a.boughtFrom}` : 'Physical'
            const qty = a.category === 'gold' && a.grams ? `${a.grams} g${a.karat ? ` · ${a.karat}K` : ''}` : null
            return (
              <li key={a.id}>
                <Link href={`/dashboard/mutual-funds/asset/${a.id}`} className="flex min-h-[4.25rem] items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{formatDate(a.purchaseDate || a.updated)}{qty ? ` · ${qty}` : ''}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{where}</span>
                  </span>
                  <span className="flex h-10 w-28 shrink-0 flex-col justify-center text-right">
                    <span className="block whitespace-nowrap text-sm font-semibold tabular-nums"><Money value={v} /></span>
                    <span className="block text-xs">{g ? <Metric arrow={false} amount={g.gain} className="text-xs" /> : <span className="text-muted-foreground">-</span>}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      </Panel>
      {form && <AssetForm row={null} category={type === 'Gold' ? 'gold' : 'commodity'} commodity={type} onClose={() => setForm(false)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success('Purchase added') }} />}
    </div>
  )
}
