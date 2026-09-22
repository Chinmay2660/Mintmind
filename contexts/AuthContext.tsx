'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { clearCachedUser, getCachedUser, setCachedUser } from '@/lib/offline/session'
import type { AuthContextValue, AuthProviderProps } from '@/types/auth'
import type { User } from '@/types/user'

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeUser(userData: User | null): User | null {
  if (!userData) return null
  if (!userData.name && userData.email) {
    return { ...userData, name: userData.email.split('@')[0] }
  }
  return userData
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => getCachedUser())
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const checkingRef = useRef(false)
  const mountedRef = useRef(true)
  const sessionFetchedRef = useRef(false)

  const checkSession = useCallback(async () => {
    if (checkingRef.current) return

    checkingRef.current = true
    const cachedUser = normalizeUser(getCachedUser())

    try {
      const response = await axios.get('/api/auth/session', {
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!mountedRef.current) return

      if (response.status === 401 || !response.data.user) {
        clearCachedUser()
        setUser(null)
        return
      }

      const userData = normalizeUser(response.data.user as User)
      setCachedUser(userData)
      setUser(userData)
    } catch {
      if (mountedRef.current) {
        setUser(cachedUser)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
      checkingRef.current = false
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    if (!sessionFetchedRef.current) {
      sessionFetchedRef.current = true
      checkSession()
    }

    return () => {
      mountedRef.current = false
    }
  }, [checkSession])

  const signOut = async () => {
    try {
      await axios.post('/api/auth/logout')
    } catch {
      // still clear local session below
    }

    clearCachedUser()

    if (mountedRef.current) {
      setUser(null)
      sessionFetchedRef.current = false
    }

    router.push('/auth/signin')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refetch: checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    return { user: null, loading: true, signOut: async () => {}, refetch: async () => {} }
  }
  return context
}
