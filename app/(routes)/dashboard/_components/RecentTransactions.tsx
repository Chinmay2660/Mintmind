'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'
import { withFromHome } from '@/lib/utils/navigation'
import { DEFAULT_CATEGORY_COLOR } from '@/lib/constants/colors'
import { cn } from '@/lib/utils'

export interface DashboardTransaction {
  _id?: string
  id?: string
  type?: string
  amount?: number
  description?: string
  date?: string
  categoryId?: { name?: string; icon?: string; color?: string }
}

const TRANSACTIONS_HREF = withFromHome('/dashboard/transactions')

function describe(tx: DashboardTransaction) {
  const isIncome = tx.type === 'income'
  const isTransfer = tx.type === 'transfer'
  const categoryColor = tx.categoryId?.color || DEFAULT_CATEGORY_COLOR
  return {
    key: tx._id || tx.id,
    title: tx.description || (isTransfer ? 'Transfer' : tx.categoryId?.name) || 'Transaction',
    category: isTransfer ? 'Transfer' : tx.categoryId?.name || 'Uncategorised',
    color: isTransfer ? 'hsl(var(--warning))' : categoryColor,
    tint: isTransfer ? 'hsl(var(--warning) / 0.1)' : `${categoryColor}18`,
    icon: isTransfer ? '↔' : tx.categoryId?.icon || (isIncome ? '💰' : '📁'),
    date: tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '',
    sign: isIncome ? '+' : isTransfer ? '' : '−',
    tone: isIncome ? 'text-income' : isTransfer ? 'text-warning' : 'text-foreground',
  }
}

function CategoryIcon({ icon, tint }: { icon: string; tint: string }) {
  return (
    <div
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
      style={{ backgroundColor: tint }}
    >
      {icon}
    </div>
  )
}

export function RecentTransactions({
  transactions,
  loading,
}: {
  transactions: DashboardTransaction[]
  loading: boolean
}) {
  const { fmt } = usePrivacyAmount()

  if (loading) {
    return (
      <div className="surface-card space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-xl" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="surface-card px-6 py-10 text-center text-sm text-muted-foreground">
        No transactions yet. Log your first expense or income to get started.
      </div>
    )
  }

  const rows = transactions.map(describe)

  return (
    <div className="surface-card overflow-hidden">
      <table className="hidden w-full table-fixed text-sm lg:table">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            <th scope="col" className="w-[40%] px-5 py-3 font-medium">Description</th>
            <th scope="col" className="w-[22%] px-5 py-3 font-medium">Category</th>
            <th scope="col" className="w-[18%] px-5 py-3 font-medium">Date</th>
            <th scope="col" className="w-[20%] px-5 py-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, i) => (
            <tr key={row.key ?? i} className="transition-colors hover:bg-muted/25">
              <td className="px-5 py-3">
                <Link
                  href={TRANSACTIONS_HREF}
                  className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CategoryIcon icon={row.icon} tint={row.tint} />
                  <span className="truncate font-medium">{row.title}</span>
                </Link>
              </td>
              <td className="px-5 py-3">
                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                  <span className="truncate">{row.category}</span>
                </span>
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{row.date}</td>
              <td className={cn('whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums', row.tone)}>
                {row.sign}
                {fmt(transactions[i].amount || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border/60 lg:hidden">
        {rows.map((row, i) => (
          <li key={row.key ?? i}>
            <Link href={TRANSACTIONS_HREF} className="mm-list-row rounded-none border-0 px-4 py-3.5">
              <CategoryIcon icon={row.icon} tint={row.tint} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {row.category} · {row.date}
                </p>
              </div>
              <p className={cn('shrink-0 text-sm font-semibold tabular-nums', row.tone)}>
                {row.sign}
                {fmt(transactions[i].amount || 0)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
