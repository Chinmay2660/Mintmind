import apiClient from '../client'

export const transactionsService = {
  getAll: (filters = {}) => {
    const params = {}
    if (filters.type) params.type = filters.type
    if (filters.limit) params.limit = filters.limit
    return apiClient.get('/transactions', { params })
  },
  
  getById: (id) => apiClient.get(`/transactions/${id}`),
  
  create: (data) => apiClient.post('/transactions', data),
  
  update: (id, data) => apiClient.put(`/transactions/${id}`, data),
  
  delete: (id) => apiClient.delete(`/transactions/${id}`),
}

