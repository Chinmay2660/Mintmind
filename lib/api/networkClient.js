import axios from 'axios'

const networkClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

networkClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname
      if (!path.startsWith('/auth')) {
        const signInUrl = new URL('/auth/signin', window.location.origin)
        signInUrl.searchParams.set('reason', 'session_expired')
        signInUrl.searchParams.set('callbackUrl', path)
        window.location.href = signInUrl.toString()
      }
    }

    const message = error.response?.data?.error || error.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

export default networkClient
