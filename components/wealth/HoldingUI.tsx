import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The shared look for anything you hold, after the investing apps: a header with one big number and three small ones,
 * a card per holding with its name on the left and three labelled figures under it, and a plain list of facts for the detail page.
 */

export interface Fig { label: string; value: ReactNode; /** a small second line under the figure, such as the percentage */ sub?: ReactNode; tone?: 'good' }

const toneClass = (t?: Fig['tone']) => (t === 'good' ? 'text-success' : 'text-foreground')

/** A small label over a figure; the building block of the three-column rows. */
function Cell({ f, align }: { f: Fig; align: 'left' | 'center' | 'right' }) {
  return (
    <div className={cn('min-w-0', align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left')}>
      <p className="truncate text-xs text-muted-foreground">{f.label}</p>
      <p className={cn('mt-0.5 whitespace-nowrap text-sm font-semibold tabular-nums', toneClass(f.tone))}>{f.value}</p>
      {f.sub != null && <p className={cn('whitespace-nowrap text-xs tabular-nums', toneClass(f.tone))}>{f.sub}</p>}
    </div>
  )
}

const aligns = ['left', 'center', 'right'] as const

/** The summary card of a page (the same on every investment tab, Banks and Insurance): one large figure, then a few labelled rows. */
export function OverviewCard({ label, value, rows }: { label: string; value: ReactNode; rows: { label: string; value: ReactNode }[] }) {
  return (
    <section aria-label={`${label} overview`} className="surface-card px-4">
      <p className="pt-4 text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <dl className={cn('text-sm', rows.length ? 'space-y-2.5 py-4' : 'pb-4')}>
        {rows.map((r) => <div key={r.label} className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{r.label}</dt><dd className="font-semibold tabular-nums">{r.value}</dd></div>)}
      </dl>
    </section>
  )
}

/** The top of a section: what it is worth, how it moved, then up to three figures across. */
export function SummaryHeader({ label, value, sub, stats }: { label: string; value: ReactNode; sub?: ReactNode; stats: Fig[] }) {
  return (
    <section aria-label={label} className="border-b border-border pb-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <div className="mt-1 text-sm">{sub}</div>}
      {stats.length > 0 && (
        <div className={cn('mt-4 grid gap-3', stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
          {/* two figures sit at the two ends; three have the middle one centred */}
          {stats.slice(0, 3).map((s, i) => <Cell key={s.label} f={s} align={stats.length === 2 ? (i === 0 ? 'left' : 'right') : aligns[i]} />)}
        </div>
      )}
    </section>
  )
}

/** One holding as a card: name and kind on top, an optional line under the name, then three figures across. */
export function HoldingCard({ title, tag, sub, figs, href, onClick, ariaLabel }: {
  title: string; tag?: string; sub?: ReactNode; figs: Fig[]; href?: string; onClick?: () => void; ariaLabel?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
          {(tag || sub) && <div className="mt-0.5 text-xs text-muted-foreground">{tag}{tag && sub ? ' · ' : ''}{sub}</div>}
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {figs.slice(0, 3).map((f, i) => <Cell key={f.label} f={f} align={aligns[i]} />)}
      </div>
    </>
  )
  const cls = 'surface-card block w-full p-4 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring'
  return href
    ? <Link href={href} aria-label={ariaLabel} className={cls}>{body}</Link>
    : <button type="button" onClick={onClick} aria-label={ariaLabel} className={cls}>{body}</button>
}

/** A plain list of facts, label left and value right, with a line between them. */
export function DetailRows({ title, rows }: { title?: string; rows: { label: string; value: ReactNode }[] }) {
  return (
    <section className="surface-card p-4">
      {title && <h3 className="mb-1 text-base font-semibold">{title}</h3>}
      <dl className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="text-right font-medium tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
