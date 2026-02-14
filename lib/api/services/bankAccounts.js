import apiClient from '../client'

export const bankAccountsService = {
  getAll: () => apiClient.get('/bank-accounts'),
  
  getById: (id) => apiClient.get(`/bank-accounts/${id}`),
  
  create: (data) => apiClient.post('/bank-accounts', data),
  
  update: (id, data) => apiClient.put(`/bank-accounts/${id}`, data),
  
  delete: (id) => apiClient.delete(`/bank-accounts/${id}`),
}

