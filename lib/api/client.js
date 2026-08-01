import { offlineRequest, stripApiPrefix } from '@/lib/offline/offlineApi'
import { isOfflineRoute } from '@/lib/offline/entities'
import networkClient from './networkClient'

async function request(method, url, data, config = {}) {
  const path = stripApiPrefix(url)
  const query = config?.params
    ? `?${new URLSearchParams(config.params).toString()}`
    : ''
  const offlinePath = `${path}${query}`

  if (isOfflineRoute(offlinePath)) {
    const result = await offlineRequest(method, offlinePath, data)
    if (result !== null) return result
  }

  const httpMethod = method.toLowerCase()
  if (httpMethod === 'get' || httpMethod === 'delete') {
    return networkClient[httpMethod](path, config)
  }
  return networkClient[httpMethod](path, data, config)
}

const apiClient = {
  get: (url, config) => request('GET', url, undefined, config),
  post: (url, data, config) => request('POST', url, data, config),
  put: (url, data, config) => request('PUT', url, data, config),
  delete: (url, config) => request('DELETE', url, undefined, config),
}

export default apiClient
