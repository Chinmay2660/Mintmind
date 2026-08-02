'use client'

import { useCallback, useEffect, useState } from 'react'
import request from '@/lib/api/request'
import { useOffline } from '@/contexts/OfflineContext'

const CACHE_TTL_MS = 60_000

type CacheEntry<T> = { data: T; fetchedAt: number }

type Category = { _id?: string; type?: string; name?: string; icon?: string }
type BankAccount = { _id?: string; accountName?: string; icon?: string }

const categoriesCache: { expense?: CacheEntry<Category[]>; income?: CacheEntry<Category[]> } = {}
let accountsCache: CacheEntry<BankAccount[]> | null = null

function isFresh<T>(entry: CacheEntry<T> | null | undefined) {
  return entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS
}

export function invalidateReferenceDataCache() {
  categoriesCache.expense = undefined
  categoriesCache.income = undefined
  accountsCache = null
}

export function useCategories(userId?: string) {
  const { online } = useOffline()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async (force = false) => {
    if (!userId) return

    if (
      !force &&
      isFresh(categoriesCache.expense) &&
      isFresh(categoriesCache.income)
    ) {
      setCategories([...(categoriesCache.expense?.data ?? []), ...(categoriesCache.income?.data ?? [])])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [expenseCats, incomeCats] = await Promise.all([
        request.get('/api/categories?type=expense'),
        request.get('/api/categories?type=income'),
      ])
      categoriesCache.expense = { data: expenseCats.data, fetchedAt: Date.now() }
      categoriesCache.income = { data: incomeCats.data, fetchedAt: Date.now() }
      setCategories([...expenseCats.data, ...incomeCats.data])
    } catch {
      setCategories((prev) => prev)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) fetchCategories()
  }, [userId, online, fetchCategories])

  return { categories, loading, refetch: () => fetchCategories(true) }
}

export function useBankAccounts(userId?: string) {
  const { online } = useOffline()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async (force = false) => {
    if (!userId) return

    if (!force && isFresh(accountsCache)) {
      setAccounts(accountsCache?.data ?? [])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await request.get('/api/bank-accounts')
      accountsCache = { data: response.data, fetchedAt: Date.now() }
      setAccounts(response.data)
    } catch {
      setAccounts((prev) => prev)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) fetchAccounts()
  }, [userId, online, fetchAccounts])

  return { accounts, loading, refetch: () => fetchAccounts(true) }
}
