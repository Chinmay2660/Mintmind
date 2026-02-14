import apiClient from '../client'

export const categoriesService = {
  getAll: (type = null) => {
    const params = type ? { type } : {}
    return apiClient.get('/categories', { params })
  },
  
  getById: (id) => apiClient.get(`/categories/${id}`),
  
  create: (data) => apiClient.post('/categories', data),
  
  update: (id, data) => apiClient.put(`/categories/${id}`, data),
  
  delete: (id) => apiClient.delete(`/categories/${id}`),
}

