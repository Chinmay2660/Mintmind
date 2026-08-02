import { clearOfflineData } from './db'

const CACHE_KEY = 'mintmind_cached_user'

export function getCachedUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCachedUser(user) {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(user))
    return
  }
  localStorage.removeItem(CACHE_KEY)
}

export function clearCachedUser() {
  setCachedUser(null)
}

export async function clearOfflineSession() {
  clearCachedUser()
  await clearOfflineData()
}
