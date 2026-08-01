'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import type { AuthContextValue, AuthProviderProps } from '@/types/auth'
import type { User } from '@/types/user'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const checkingRef = useRef(false)
  const mountedRef = useRef(true)
  const sessionFetchedRef = useRef(false)

  const checkSession = useCallback(async () => {
    if (checkingRef.current) return

    checkingRef.current = true

    try {
      const response = await axios.get('/api/auth/session', {
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (mountedRef.current) {
        const userData = response.data.user as User | null
        if (userData && !userData.name && userData.email) {
          userData.name = userData.email.split('@')[0]
        }
        setUser(userData)
      }
    } catch {
      if (mountedRef.current) setUser(null)
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
      if (mountedRef.current) {
        setUser(null)
        sessionFetchedRef.current = false
      }
      router.push('/auth/signin')
    } catch {
      // Error handled silently
    }
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
