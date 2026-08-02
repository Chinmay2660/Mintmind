'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Wallet, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { isNativePlatform } from '@/lib/platform'
import axios from 'axios'
import { toast } from 'sonner'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isNative, setIsNative] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    setIsNative(isNativePlatform())
  }, [])

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  useEffect(() => {
    // Load Google Identity Services script
    const loadGoogleScript = () => {
      if (typeof window === 'undefined' || window.google) {
        initializeGoogleSignIn()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      
      script.onload = () => {
        initializeGoogleSignIn()
      }
      
      script.onerror = () => {
        console.error('Failed to load Google Identity Services')
        setError('Failed to load Google Sign-In. Please refresh the page.')
      }
      
      document.head.appendChild(script)
    }

    const initializeGoogleSignIn = () => {
      if (!window.google) {
        console.error('Google script not loaded')
        return
      }
      
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        console.error('Google Client ID not found')
        setError('Google Sign-In is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env.local file.')
        return
      }

      try {
        // Initialize Google Identity Services (no button rendering - we use our custom button)
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        })
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error)
        setError('Failed to initialize Google Sign-In')
      }
    }

    loadGoogleScript()
  }, [])


  const handleGoogleCallback = async (response) => {
    try {
      setLoading(true)
      setError('')

      // Handle both credential (ID token) and access token responses
      const idToken = response.credential || response.access_token
      
      if (!idToken) {
        throw new Error('No token received from Google')
      }

      // Send ID token to backend
      const authResponse = await axios.post('/api/auth/google', {
        idToken: idToken,
      })

      if (authResponse.data.success) {
        toast.success('Signed in successfully!')
        // Force a page reload to refresh session data
        window.location.href = callbackUrl
      } else {
        throw new Error('Authentication failed')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignInClick = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    
    if (!clientId) {
      setError('Google Sign-In is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env.local file and restart the server.')
      return
    }

    if (window.google && window.google.accounts) {
      try {
        setLoading(true)
        setError('')
        
        // Use Google Identity Services to trigger sign-in with ID token
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          callback: async (response) => {
            if (response.error) {
              console.error('Google OAuth error:', response.error)
              setError('Authentication failed. Please try again.')
              setLoading(false)
              return
            }
            
            if (response.access_token) {
              try {
                // Send access token to backend - backend will fetch user info
                const authResponse = await axios.post('/api/auth/google', {
                  accessToken: response.access_token,
                })

                if (authResponse.data.success) {
                  toast.success('Signed in successfully!')
                  // Small delay to ensure cookie is set, then reload
                  setTimeout(() => {
                    window.location.href = callbackUrl
                  }, 100)
                } else {
                  throw new Error('Authentication failed')
                }
              } catch (err) {
                console.error('Error during authentication:', err)
                setError(err.response?.data?.error || err.message || 'Failed to sign in. Please try again.')
                setLoading(false)
              }
            } else {
              setError('No access token received from Google')
              setLoading(false)
            }
          },
          scope: 'openid email profile',
        })
        
        tokenClient.requestAccessToken()
      } catch (error) {
        console.error('Error initiating Google Sign-In:', error)
        setError('Failed to start Google Sign-In. Please try again.')
        setLoading(false)
      }
    } else {
      setError('Google Sign-In is not loaded. Please refresh the page.')
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  // Native app layout (simplified, full-screen)
  if (isNative) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center landing-bg aurora-bg text-foreground p-6 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md space-y-6"
        >
          <div className="text-center mb-8">
            <Logo />
            <h1 className="text-3xl font-bold text-foreground mt-4 mb-2">
              Welcome to Mintmind
            </h1>
            <p className="text-muted-foreground">
              Sign in with Google to continue
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Custom Google Sign-In button */}
          {!loading && (
            <Button
              onClick={handleGoogleSignInClick}
              className="w-full h-14 text-base font-medium rounded-xl"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </div>
            </Button>
          )}
          
          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground mt-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  // Web layout (existing split-screen design)
  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center landing-bg aurora-bg text-foreground p-4 relative overflow-hidden">

      {/* Back to Home Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 left-6 z-10"
      >
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2 text-sm group hover-lift">
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Button>
        </Link>
      </motion.div>

      {/* Left Section: Branding & Features */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex flex-col items-center justify-center w-full lg:w-1/2 h-full p-8 text-foreground text-center relative z-10"
      >
        <div className="max-w-md space-y-8">
          <Logo />
          <h1 className="text-4xl font-extrabold leading-tight">
            Take Control of Your <span className="liquid-gradient-text">Financial Future</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Mintmind helps you track expenses, manage investments, and achieve your financial goals with ease.
          </p>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-6 text-left mt-8"
          >
            {[
              { icon: Wallet, text: 'Multiple Bank Accounts' },
              { icon: TrendingUp, text: 'Investment Tracking' },
              { icon: BarChart3, text: 'Visual Analytics' },
              { icon: Shield, text: 'Secure & Private' },
            ].map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div key={index} variants={itemVariants} className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-base text-foreground">{feature.text}</span>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </motion.div>

      {/* Right Section: Sign-in Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10"
      >
        <div className="w-full max-w-md surface-card p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Welcome to Mintmind</h2>
            <p className="text-muted-foreground">
              Sign in with Google to manage your finances
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Custom Google Sign-In button */}
          {!loading && (
            <Button
              onClick={handleGoogleSignInClick}
              className="w-full h-12 text-base font-medium rounded-xl"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </div>
            </Button>
          )}
          
          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center landing-bg text-foreground">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
