'use client'

import { ArrowLeftRight } from 'lucide-react'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { formatCurrency } from '@/lib/utils/format'
import {
  getTransactionSubtitle,
  getTransactionTitle,
  transactionAmountClass,
  transactionAmountPrefix,
  type DayGroup,
  type TransactionLike,
} from '@/lib/utils/transactions'

interface TransactionGroupedListProps {
  groups: DayGroup<TransactionLike>[]
  onEdit?: (tx: TransactionLike) => void
  onDelete?: (id: string) => void
}

export function TransactionGroupedList({ groups, onEdit, onDelete }: TransactionGroupedListProps) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.dateKey} className="surface-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-muted-foreground/50 w-7 text-center">
                {group.dayOfMonth}
              </span>
              <span className="text-sm font-semibold text-foreground">{group.label}</span>
            </div>
            <div className="flex gap-3 text-xs">
              {group.summary.income > 0 && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  +{formatCurrency(group.summary.income)}
                </span>
              )}
              {group.summary.expense > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  -{formatCurrency(group.summary.expense)}
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-border/40">
            {group.transactions.map((transaction) => {
              const catColor = transaction.categoryId?.color || '#4845d2'
              const isTransfer = transaction.type === 'transfer'
              const interactive = Boolean(onEdit && onDelete)
              const row = (
                <div className="flex items-center gap-3 px-4 py-3 active:bg-muted/30 transition-colors">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: isTransfer ? 'hsl(var(--muted))' : `${catColor}22`,
                      }}
                    >
                      {isTransfer ? (
                        <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
                      ) : transaction.categoryId?.icon ? (
                        <span className="text-lg">{transaction.categoryId.icon}</span>
                      ) : (
                        <span className="text-lg">{transaction.type === 'income' ? '💰' : '📁'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {getTransactionTitle(transaction)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getTransactionSubtitle(transaction)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold flex-shrink-0 ${transactionAmountClass(transaction.type)}`}
                    >
                      {transactionAmountPrefix(transaction.type)}
                      {formatCurrency(transaction.amount)}
                    </p>
                    {interactive && (
                      <DesktopRowActions>
                        <EditButton onClick={() => onEdit?.(transaction)} />
                        <DeleteButton onClick={() => onDelete?.(transaction._id)} />
                      </DesktopRowActions>
                    )}
                  </div>
              )

              if (!interactive) {
                return <div key={transaction._id}>{row}</div>
              }

              return (
                <SwipeableRow
                  key={transaction._id}
                  onEdit={() => onEdit?.(transaction)}
                  onDelete={() => onDelete?.(transaction._id)}
                >
                  {row}
                </SwipeableRow>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
