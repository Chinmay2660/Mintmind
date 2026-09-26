'use client'

import { useLocalList } from '@/lib/hooks/useLocalData'

type Category = {
  _id?: string
  type?: string
  name?: string
  icon?: string
  color?: string
  budget?: number
  parentId?: string | { _id?: string }
  order?: number
}
type BankAccount = {
  _id?: string
  accountName?: string
  bankName?: string
  accountType?: string
  accountNumber?: string
  balance?: number
  color?: string
  icon?: string
  ownershipType?: 'Individual' | 'Joint'
  jointHolders?: string
  operationMode?: string
  ifscCode?: string
  branch?: string
  nomineeName?: string
}

export function useCategories(userId?: string) {
  const { data, loading, reload } = useLocalList<Category>('categories', userId)
  return { categories: data, loading, refetch: reload }
}

export function useBankAccounts(userId?: string) {
  const { data, loading, reload } = useLocalList<BankAccount>('bankAccounts', userId)
  return { accounts: data, loading, refetch: reload }
}
