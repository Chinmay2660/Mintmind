'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const checkingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    checkSession()
    
    return () => {
      mountedRef.current = false
    }
  }, [])

  const checkSession = async () => {
    // Prevent multiple simultaneous calls
    if (checkingRef.current) {
      return
    }
    
    checkingRef.current = true
    
    try {
      const response = await axios.get('/api/auth/session', {
        // Prevent redirects
        maxRedirects: 0,
        validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
        // Add cache busting to ensure fresh data
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
  }

  const signOut = async () => {
    try {
      await axios.post('/api/auth/logout')
      if (mountedRef.current) {
        setUser(null)
      }
      router.push('/auth/signin')
    } catch (error) {
      // Error handled silently
    }
  }

  return { user, loading, signOut, refetch: checkSession }
}

