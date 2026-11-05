'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { ASSET_LABELS, LIABILITY_LABELS } from '@/lib/wealth/labels'
import { formatDate } from '@/lib/wealth/format'
import { monthLabel } from '@/lib/wealth/selectors'
import { Money } from './Money'
import { Delta, Empty, Panel } from './kit'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const liabLabel = (k: string) => LIABILITY_LABELS[k as keyof typeof LIABILITY_LABELS] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

/** Month-by-month record: open any month to see the assets and debts behind its total. Months with no data stay empty. */
export function NetWorthJournal() {
  const { data, db } = useWealth()
  const [open, setOpen] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const rows = useMemo(() => {
    const sorted = [...data.snapshots].sort((a: any, b: any) => a.date.localeCompare(b.date))
    return sorted.map((s: any, i: number) => ({ s, prev: i > 0 ? sorted[i - 1] : null })).reverse()
  }, [data.snapshots])

  return (
    <Panel title="Journal">
      {rows.length === 0 ? <Empty title="No months recorded yet" /> : (
        <ul className="divide-y divide-border">
          {rows.slice(0, 24).map(({ s, prev }: any) => {
            const isOpen = open === s.id
            return (
              <li key={s.id}>
                <button type="button" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : s.id); setNote(s.note || '') }} className="flex w-full items-center justify-between gap-3 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted">
                  <span className="min-w-0"><span className="block text-sm font-medium">{monthLabel(s.id)}{s.note ? <StickyNote className="ml-1.5 inline h-3.5 w-3.5 text-muted-foreground" aria-label="Has a note" /> : null}</span><span className="text-xs text-muted-foreground">as of {formatDate(s.date)}</span></span>
                  <span className="flex shrink-0 items-center gap-3"><span className="text-right"><span className="block text-sm font-semibold"><Money value={s.netWorth} /></span>{prev && <Delta amount={s.netWorth - prev.netWorth} />}</span><ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} /></span>
                </button>
                {isOpen && (
                  <div className="grid gap-5 pb-4 pt-1 text-sm md:grid-cols-2">
                    <div><p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assets · <Money value={s.assets} compact /></p><dl className="divide-y divide-border">{Object.entries(s.assetBreakdown || {}).filter(([, v]) => (v as number) > 0).map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt>{ASSET_LABELS[k as keyof typeof ASSET_LABELS] ?? k}</dt><dd className="text-muted-foreground"><Money value={v as number} /></dd></div>)}</dl></div>
                    <div><p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liabilities · <Money value={s.liabilities} compact /></p><dl className="divide-y divide-border">{Object.entries(s.liabilityBreakdown || {}).filter(([, v]) => (v as number) > 0).map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt>{liabLabel(k)}</dt><dd className="text-muted-foreground"><Money value={v as number} /></dd></div>)}</dl></div>
                    <form className="flex gap-2 md:col-span-2" onSubmit={async (e) => { e.preventDefault(); await db.snapshots.update(s.id, { note: note.trim() }); toast.success('Note saved') }}>
                      <Input aria-label={`Note for ${monthLabel(s.id)}`} placeholder="Add a note to this month, e.g. “bonus received”" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} /><Button type="submit" size="sm" variant="outline">Save note</Button>
                    </form>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
