import networkClient from './networkClient'

const apiClient = {
  get: (url, config) => networkClient.get(url.replace(/^\/api/, '') || '/', config),
  post: (url, data, config) => networkClient.post(url.replace(/^\/api/, '') || '/', data, config),
  put: (url, data, config) => networkClient.put(url.replace(/^\/api/, '') || '/', data, config),
  delete: (url, config) => networkClient.delete(url.replace(/^\/api/, '') || '/', config),
}

export default apiClient
