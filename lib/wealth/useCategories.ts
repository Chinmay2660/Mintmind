'use client'

import { useMemo } from 'react'
import { useWealth } from './WealthContext'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './labels'

/**
 * User-managed categories (Budget & Expenses → Categories). Falls back to sensible defaults, and also lists any
 * category already used on an entry (e.g. restored from a backup) so nothing can become un-selectable.
 */
export function useCategories() {
  const { data } = useWealth()
  const stored = data.meta.find((m: any) => m.key === 'categories')?.value
  return useMemo(() => {
    const expense: string[] = [...(stored?.expense?.length ? stored.expense : EXPENSE_CATEGORIES)]
    const income: string[] = [...(stored?.income?.length ? stored.income : INCOME_CATEGORIES)]
    for (const e of data.expenses) if (e.category && !expense.includes(e.category)) expense.push(e.category)
    for (const t of data.bankTxns) if (t.type === 'income' && t.category && !income.includes(t.category)) income.push(t.category)
    return { expense, income }
  }, [stored, data.expenses, data.bankTxns])
}
