import request from '@/lib/api/request'

export async function fetchDashboardStats() {
  const res = await request.get('/api/dashboard/stats')
  return res.data
}

export async function fetchTransactionStats(filters = {}) {
  const params = {}
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate
  if (filters.types) params.types = filters.types
  if (filters.period) params.period = filters.period
  if (filters.accountIds) params.accountIds = filters.accountIds
  if (filters.includeCash) params.includeCash = String(filters.includeCash)
  if (filters.cashOnly) params.cashOnly = String(filters.cashOnly)

  const res = await request.get('/api/dashboard/transaction-stats', { params })
  return res.data
}

export async function fetchBudgetStats(filters = {}) {
  const res = await request.get('/api/dashboard/budget-stats', {
    params: filters.period ? { period: filters.period } : {},
  })
  return res.data
}

export async function fetchFamilyStats() {
  const res = await request.get('/api/family/stats')
  return res.data
}
