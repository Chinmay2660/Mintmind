import { useState, useEffect } from 'react'
import { cashService } from '@/lib/api'
import { toast } from 'sonner'

export const useCash = () => {
  const [cash, setCash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCash = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await cashService.get()
      setCash(data)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching cash:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateCash = async (amount) => {
    try {
      const updated = await cashService.update(amount)
      setCash(updated)
      toast.success('Cash updated successfully')
      return updated
    } catch (err) {
      toast.error('Failed to update cash')
      throw err
    }
  }

  useEffect(() => {
    fetchCash()
  }, [])

  return {
    cash,
    loading,
    error,
    refetch: fetchCash,
    updateCash,
  }
}

