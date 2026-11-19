'use client'

import { CheckCheck, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { markReviewed } from '@/lib/wealth/actions'
import { formatDate } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Money } from '../Money'
import { Empty, Panel } from '../kit'
import type { Tx } from './Views'

/** Entries brought in from a file wait here until you have looked at them. Open one to fix its category, then mark it reviewed. */
export function ReviewView({ list, onEdit }: { list: Tx[]; onEdit: (t: Tx) => void }) {
  const { db } = useWealth()
  const items = list.filter((t) => (t.raw as any)?.needsReview)
  const done = async (these: Tx[]) => { const n = await markReviewed(db, these); toast.success(`${n} marked as reviewed`) }
  return (
    <Panel title={`To review${items.length ? ` (${items.length})` : ''}`} description="Imported entries stay here until you mark them reviewed. Nothing about their amounts or balances changes."
      action={items.length > 1 ? <Button size="sm" variant="outline" onClick={() => done(items)}><CheckCheck className="mr-1.5 h-4 w-4" />Mark all reviewed</Button> : undefined}>
      {items.length === 0 ? <Empty title="All caught up" description="Entries you import from a CSV will show up here." /> : (
        <ul className="divide-y divide-border">
          {items.slice(0, 50).map((t) => (
            <li key={t.key} className="flex items-center gap-3 py-2.5">
              <button type="button" onClick={() => onEdit(t)} className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="block truncate text-sm font-medium">{t.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.category} · {formatDate(t.date)}</span>
              </button>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{t.kind === 'income' ? '+' : '-'}<Money value={t.amount} /></span>
              <Button size="sm" variant="outline" aria-label={`Mark ${t.title} reviewed`} onClick={() => done([t])}><Check className="mr-1 h-3.5 w-3.5" />Reviewed</Button>
            </li>
          ))}
        </ul>
      )}
      {items.length > 50 && <p className="mt-3 text-xs text-muted-foreground">Showing the first 50. Mark these and the next ones appear.</p>}
    </Panel>
  )
}
