import { useState, useEffect } from 'react'
import { transactionsService } from '@/lib/api'
import { toast } from 'sonner'

export const useTransactions = (filters = {}) => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await transactionsService.getAll(filters)
      setTransactions(data)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async (data) => {
    try {
      const newTransaction = await transactionsService.create(data)
      setTransactions((prev) => [newTransaction, ...prev])
      toast.success('Transaction added successfully')
      return newTransaction
    } catch (err) {
      toast.error('Failed to add transaction')
      throw err
    }
  }

  const updateTransaction = async (id, data) => {
    try {
      const updated = await transactionsService.update(id, data)
      setTransactions((prev) =>
        prev.map((t) => (t._id === id ? updated : t))
      )
      toast.success('Transaction updated successfully')
      return updated
    } catch (err) {
      toast.error('Failed to update transaction')
      throw err
    }
  }

  const deleteTransaction = async (id) => {
    try {
      await transactionsService.delete(id)
      setTransactions((prev) => prev.filter((t) => t._id !== id))
      toast.success('Transaction deleted successfully')
    } catch (err) {
      toast.error('Failed to delete transaction')
      throw err
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [JSON.stringify(filters)])

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

