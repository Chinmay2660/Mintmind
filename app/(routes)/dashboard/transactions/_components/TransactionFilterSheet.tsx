'use client'

import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { formatCurrency } from '@/lib/utils/format'

export interface TransactionFilters {
  types: {
    income: boolean
    expense: boolean
    transferIn: boolean
    transferOut: boolean
  }
  accountIds: string[]
  includeCash: boolean
}

interface AccountOption {
  _id: string
  accountName: string
  icon?: string
  balance?: number
}

interface TransactionFilterSheetProps {
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
  accounts: AccountOption[]
  cashBalance?: number
}

export function TransactionFilterSheet({
  filters,
  onFiltersChange,
  accounts,
  cashBalance = 0,
}: TransactionFilterSheetProps) {
  const isFiltered =
    !filters.types.income ||
    !filters.types.expense ||
    !filters.types.transferIn ||
    !filters.types.transferOut ||
    filters.accountIds.length > 0 ||
    !filters.includeCash

  const toggleType = (key: keyof TransactionFilters['types']) => {
    onFiltersChange({
      ...filters,
      types: { ...filters.types, [key]: !filters.types[key] },
    })
  }

  const toggleAccount = (accountId: string) => {
    const ids = filters.accountIds.includes(accountId)
      ? filters.accountIds.filter((id) => id !== accountId)
      : [...filters.accountIds, accountId]
    onFiltersChange({ ...filters, accountIds: ids })
  }

  const resetFilters = () => {
    onFiltersChange({
      types: { income: true, expense: true, transferIn: true, transferOut: true },
      accountIds: [],
      includeCash: true,
    })
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2">
          <Filter className="w-4 h-4" />
          Filter
          {isFiltered && (
            <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5">
              •
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Filter Transactions</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Transaction Type</h3>
            <div className="space-y-2">
              {[
                { key: 'income' as const, label: 'Income' },
                { key: 'expense' as const, label: 'Expenses' },
                { key: 'transferIn' as const, label: 'Transfer-In' },
                { key: 'transferOut' as const, label: 'Transfer-Out' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl surface-inner cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.types[key]}
                    onChange={() => toggleType(key)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Accounts</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl surface-inner cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={filters.includeCash}
                    onChange={() =>
                      onFiltersChange({ ...filters, includeCash: !filters.includeCash })
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span>💵 Cash</span>
                </div>
                <span className="text-sm text-muted-foreground">{formatCurrency(cashBalance)}</span>
              </label>

              {accounts.map((account) => (
                <label
                  key={account._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl surface-inner cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filters.accountIds.includes(account._id)}
                      onChange={() => toggleAccount(account._id)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span>
                      {account.icon} {account.accountName}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(account.balance ?? 0)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  types: { income: true, expense: true, transferIn: true, transferOut: true },
  accountIds: [],
  includeCash: true,
}

export function applyClientFilters<T extends {
  type: string
  isCash?: boolean
  accountId?: { _id: string } | string | null
  transferToAccountId?: { _id: string } | string | null
  transferToIsCash?: boolean
}>(items: T[], filters: TransactionFilters): T[] {
  return items.filter((item) => {
    if (item.type === 'income' && !filters.types.income) return false
    if (item.type === 'expense' && !filters.types.expense) return false
    if (item.type === 'transfer') {
      if (!filters.types.transferIn && !filters.types.transferOut) return false
    }

    const hasAccountFilter = filters.accountIds.length > 0 || !filters.includeCash
    if (!hasAccountFilter) return true

    const accountId = typeof item.accountId === 'object' ? item.accountId?._id : item.accountId
    const toAccountId =
      typeof item.transferToAccountId === 'object'
        ? item.transferToAccountId?._id
        : item.transferToAccountId

    const matchesCash =
      filters.includeCash && (item.isCash || item.transferToIsCash)
    const matchesAccount =
      filters.accountIds.length > 0 &&
      (filters.accountIds.includes(String(accountId)) ||
        filters.accountIds.includes(String(toAccountId)))

    if (filters.accountIds.length > 0 && filters.includeCash) {
      return matchesCash || matchesAccount
    }
    if (filters.accountIds.length > 0) return matchesAccount
    if (!filters.includeCash) {
      return !item.isCash && !item.transferToIsCash
    }
    return true
  })
}
