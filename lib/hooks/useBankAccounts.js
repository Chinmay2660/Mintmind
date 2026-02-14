import { useState, useEffect } from 'react'
import { bankAccountsService } from '@/lib/api'
import { toast } from 'sonner'

export const useBankAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await bankAccountsService.getAll()
      setAccounts(data)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const createAccount = async (data) => {
    try {
      const newAccount = await bankAccountsService.create(data)
      setAccounts((prev) => [newAccount, ...prev])
      toast.success('Account added successfully')
      return newAccount
    } catch (err) {
      toast.error('Failed to add account')
      throw err
    }
  }

  const updateAccount = async (id, data) => {
    try {
      const updated = await bankAccountsService.update(id, data)
      setAccounts((prev) =>
        prev.map((acc) => (acc._id === id ? updated : acc))
      )
      toast.success('Account updated successfully')
      return updated
    } catch (err) {
      toast.error('Failed to update account')
      throw err
    }
  }

  const deleteAccount = async (id) => {
    try {
      await bankAccountsService.delete(id)
      setAccounts((prev) => prev.filter((acc) => acc._id !== id))
      toast.success('Account deleted successfully')
    } catch (err) {
      toast.error('Failed to delete account')
      throw err
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  }
}

