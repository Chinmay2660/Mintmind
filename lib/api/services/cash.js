import apiClient from '../client'

export const cashService = {
  get: () => apiClient.get('/cash'),
  
  update: (amount) => apiClient.put('/cash', { amount }),
}

