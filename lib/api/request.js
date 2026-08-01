import apiClient from './client'

function toAxiosResponse(data) {
  return { data }
}

const request = {
  get: async (url, config) => toAxiosResponse(await apiClient.get(url, config)),
  post: async (url, data, config) => toAxiosResponse(await apiClient.post(url, data, config)),
  put: async (url, data, config) => toAxiosResponse(await apiClient.put(url, data, config)),
  delete: async (url, config) => toAxiosResponse(await apiClient.delete(url, config)),
}

export default request
