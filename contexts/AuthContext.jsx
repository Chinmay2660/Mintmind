'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const checkingRef = useRef(false)
  const mountedRef = useRef(true)
  const sessionFetchedRef = useRef(false)

  const checkSession = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (checkingRef.current) {
      return
    }
    
    checkingRef.current = true
    
    try {
      const response = await axios.get('/api/auth/session', {
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      
      if (mountedRef.current) {
        const userData = response.data.user
        // Ensure name is always set - use email as fallback
        if (userData && !userData.name && userData.email) {
          userData.name = userData.email.split('@')[0]
        }
        setUser(userData)
      }
    } catch (error) {
      if (mountedRef.current) {
        setUser(null)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      checkingRef.current = false
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    
    // Only fetch session once on mount
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
    } catch (error) {
      // Error handled silently
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refetch: checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    // Fallback for components outside provider (shouldn't happen)
    return { user: null, loading: true, signOut: () => {}, refetch: () => {} }
  }
  return context
}

