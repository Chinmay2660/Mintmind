import apiClient from '../client'

export const investmentsService = {
  getAll: (type = null) => {
    const params = type ? { type } : {}
    return apiClient.get('/investments', { params })
  },
  
  getById: (id) => apiClient.get(`/investments/${id}`),
  
  create: (data) => apiClient.post('/investments', data),
  
  update: (id, data) => apiClient.put(`/investments/${id}`, data),
  
  delete: (id) => apiClient.delete(`/investments/${id}`),
}

