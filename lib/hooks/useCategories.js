import { useState, useEffect } from 'react'
import { categoriesService } from '@/lib/api'
import { toast } from 'sonner'

export const useCategories = (type = null) => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await categoriesService.getAll(type)
      setCategories(data)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async (data) => {
    try {
      const newCategory = await categoriesService.create(data)
      setCategories((prev) => [newCategory, ...prev])
      toast.success('Category added successfully')
      return newCategory
    } catch (err) {
      toast.error('Failed to add category')
      throw err
    }
  }

  const updateCategory = async (id, data) => {
    try {
      const updated = await categoriesService.update(id, data)
      setCategories((prev) =>
        prev.map((cat) => (cat._id === id ? updated : cat))
      )
      toast.success('Category updated successfully')
      return updated
    } catch (err) {
      toast.error('Failed to update category')
      throw err
    }
  }

  const deleteCategory = async (id) => {
    try {
      await categoriesService.delete(id)
      setCategories((prev) => prev.filter((cat) => cat._id !== id))
      toast.success('Category deleted successfully')
    } catch (err) {
      toast.error('Failed to delete category')
      throw err
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [type])

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}

