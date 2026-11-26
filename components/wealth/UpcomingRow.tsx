import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/wealth/format'
import { dayLabel } from '@/lib/wealth/upcoming'
import { Money } from './Money'

export interface UpcomingItem { kind: string; id: string; date: string; title: string; amount: number; href: string; label: string }

/** One payment that is coming up: what it is, its date (written like the Recent transactions dates), and the amount in the expense colour. It opens the page of that card, policy or fund. */
export function UpcomingRow({ item, today }: { item: UpcomingItem; today: Date }) {
  const urgency = dayLabel(item.date, today)
  const tone = urgency === 'Overdue' ? 'text-destructive' : urgency === 'Today' ? 'text-warning' : 'text-muted-foreground'
  return (
    <Link href={item.href} className="flex min-h-14 items-center justify-between gap-3 py-2.5 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span>{item.label}</span><span aria-hidden>·</span><span className={cn(tone)}>{formatDate(item.date)}</span></span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-expense"><Money value={item.amount} /></span>
    </Link>
  )
}
