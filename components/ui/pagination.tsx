'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAGE_SIZES } from '@/lib/hooks/usePagination'
import { Select } from '@/components/ui/pickers'

interface Props {
  page: number
  pageCount: number
  total: number
  from: number
  to: number
  pageSize: number
  onPage: (p: number) => void
  onPageSize?: (n: number) => void
  loading?: boolean
  className?: string
  label?: string
}

/** The page numbers to show: the first, the last, and a few around the current one, with gaps marked. */
const pagesToShow = (page: number, count: number) => {
  const set = new Set<number>([1, count, page, page - 1, page + 1])
  const list = [...set].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  list.forEach((p, i) => { if (i > 0 && p - list[i - 1] > 1) out.push('gap'); out.push(p) })
  return out
}

/** Previous / next, page numbers, "11-20 of 57" and an optional rows-per-page choice. Hidden when everything fits on one page. */
export function Pagination({ page, pageCount, total, from, to, pageSize, onPage, onPageSize, loading, className, label = 'Pagination' }: Props) {
  if (total <= Math.min(...PAGE_SIZES) && pageCount <= 1) return null
  return (
    <nav aria-label={label} className={cn('flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-muted-foreground', className)}>
      <span className="tabular-nums" aria-live="polite">{from}-{to} of {total}{loading ? ' …' : ''}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-md border border-border outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        {pagesToShow(page, pageCount).map((p, i) => p === 'gap'
          ? <span key={`g${i}`} className="px-1" aria-hidden>…</span>
          : <button key={p} type="button" aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined} disabled={loading} onClick={() => onPage(p)} className={cn('hidden h-8 min-w-8 rounded-md border px-2 font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-block', p === page ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>{p}</button>)}
        <span className="px-2 tabular-nums sm:hidden">Page {page} of {pageCount}</span>
        <button type="button" aria-label="Next page" disabled={page >= pageCount || loading} onClick={() => onPage(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-md border border-border outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
      {onPageSize && (
        <label className="flex items-center gap-2">Rows
          <div className="w-20"><Select aria-label="Rows per page" value={String(pageSize)} onChange={(e) => onPageSize(Number(e.target.value))}>{PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}</Select></div>
        </label>
      )}
    </nav>
  )
}
