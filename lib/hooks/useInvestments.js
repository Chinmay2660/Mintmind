import { useState, useEffect } from 'react'
import { investmentsService } from '@/lib/api'
import { toast } from 'sonner'

export const useInvestments = (type = null) => {
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInvestments = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await investmentsService.getAll(type)
      setInvestments(data)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load investments')
    } finally {
      setLoading(false)
    }
  }

  const createInvestment = async (data) => {
    try {
      const newInvestment = await investmentsService.create(data)
      setInvestments((prev) => [newInvestment, ...prev])
      toast.success('Investment added successfully')
      return newInvestment
    } catch (err) {
      toast.error('Failed to add investment')
      throw err
    }
  }

  const updateInvestment = async (id, data) => {
    try {
      const updated = await investmentsService.update(id, data)
      setInvestments((prev) =>
        prev.map((inv) => (inv._id === id ? updated : inv))
      )
      toast.success('Investment updated successfully')
      return updated
    } catch (err) {
      toast.error('Failed to update investment')
      throw err
    }
  }

  const deleteInvestment = async (id) => {
    try {
      await investmentsService.delete(id)
      setInvestments((prev) => prev.filter((inv) => inv._id !== id))
      toast.success('Investment deleted successfully')
    } catch (err) {
      toast.error('Failed to delete investment')
      throw err
    }
  }

  useEffect(() => {
    fetchInvestments()
  }, [type])

  return {
    investments,
    loading,
    error,
    refetch: fetchInvestments,
    createInvestment,
    updateInvestment,
    deleteInvestment,
  }
}

