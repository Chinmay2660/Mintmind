import apiClient from '../client'

export const dashboardService = {
  getStats: () => apiClient.get('/dashboard/stats'),
}

