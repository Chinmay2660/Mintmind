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
  Check,
  Sparkles,
} from 'lucide-react'
import LiquidBackground from '@/app/_components/LiquidBackground'
import axios from 'axios'
import { toast } from 'sonner'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

const CONFIG_ERROR =
  'Sign-in is temporarily unavailable. Please try again later or contact support.'

const FEATURES = [
  { icon: Wallet, label: 'Multi-account tracking' },
  { icon: TrendingUp, label: 'Investment insights' },
  { icon: BarChart3, label: 'Visual analytics' },
  { icon: Shield, label: 'Secure & private' },
] as const

const TRUST_POINTS = ['Free forever', 'No credit card', 'Works offline'] as const

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (!window.google) return
      if (!GOOGLE_CLIENT_ID) {
        console.error('Google Client ID not configured')
        return
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        })
      } catch (err) {
        console.error('Error initializing Google Sign-In:', err)
      }
    }

    const loadGoogleScript = () => {
      if (typeof window === 'undefined') return
      if (window.google) {
        initializeGoogleSignIn()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initializeGoogleSignIn
      script.onerror = () => {
        console.error('Failed to load Google Identity Services')
        setError('Failed to load Google Sign-In. Please refresh the page.')
      }
      document.head.appendChild(script)
    }

    loadGoogleScript()
  }, [])

  const handleGoogleCallback = async (response: { credential?: string; access_token?: string }) => {
    try {
      setLoading(true)
      setError('')

      const idToken = response.credential || response.access_token
      if (!idToken) throw new Error('No token received from Google')

      const authResponse = await axios.post('/api/auth/google', { idToken })

      if (authResponse.data.success) {
        toast.success('Signed in successfully!')
        window.location.href = callbackUrl
      } else {
        throw new Error('Authentication failed')
      }
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : 'Failed to sign in. Please try again.'
      setError(message)
      setLoading(false)
    }
  }

  const handleGoogleSignInClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError(CONFIG_ERROR)
      return
    }

    if (!window.google?.accounts) {
      setError('Google Sign-In is not loaded. Please refresh the page.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (response.error) {
            console.error('Google OAuth error:', response.error)
            setError('Authentication failed. Please try again.')
            setLoading(false)
            return
          }

          if (!response.access_token) {
            setError('No access token received from Google')
            setLoading(false)
            return
          }

          try {
            const authResponse = await axios.post('/api/auth/google', {
              accessToken: response.access_token,
            })

            if (authResponse.data.success) {
              toast.success('Signed in successfully!')
              setTimeout(() => {
                window.location.href = callbackUrl
              }, 100)
            } else {
              throw new Error('Authentication failed')
            }
          } catch (err: unknown) {
            console.error('Error during authentication:', err)
            const message =
              axios.isAxiosError(err) && err.response?.data?.error
                ? String(err.response.data.error)
                : 'Failed to sign in. Please try again.'
            setError(message)
            setLoading(false)
          }
        },
        scope: 'openid email profile',
      })

      tokenClient.requestAccessToken()
    } catch (err) {
      console.error('Error initiating Google Sign-In:', err)
      setError('Failed to start Google Sign-In. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden landing-bg text-foreground">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <LiquidBackground />

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-5 left-4 sm:top-6 sm:left-6 z-20"
      >
        <Link href="/">
          <Button
            variant="outline"
            className="flex items-center gap-2 text-sm group liquid-glass border-border/60 hover:bg-card/80"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Button>
        </Link>
      </motion.div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Branding */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <div className="space-y-8">
              <Logo />

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full liquid-pill px-4 py-1.5 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  <span>Your finances, one place</span>
                </div>
                <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
                  Take control of your{' '}
                  <span className="liquid-gradient-text">financial future</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                  Track expenses, manage investments, and hit your goals — all in a
                  beautifully designed app that works offline.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map((feature, i) => {
                  const Icon = feature.icon
                  return (
                    <motion.div
                      key={feature.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="flex items-center gap-3 rounded-xl liquid-glass px-4 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg liquid-gradient-bg">
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{feature.label}</span>
                    </motion.div>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {TRUST_POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sign-in card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-md"
          >
            <div className="liquid-glass-border rounded-3xl liquid-glass p-8 sm:p-10 shadow-2xl shadow-primary/5">
              <div className="mb-8 flex justify-center lg:hidden">
                <Logo />
              </div>

              <div className="mb-8 space-y-2 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Welcome back
                </h2>
                <p className="text-muted-foreground">
                  Sign in with Google to continue to Mintmind
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center"
                >
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignInClick}
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-base font-medium text-foreground shadow-sm transition-all hover:bg-muted/50 hover:shadow-md active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
                By continuing, you agree to use Mintmind for personal finance tracking.
                We never share your data with third parties.
              </p>

              {!GOOGLE_CLIENT_ID && process.env.NODE_ENV === 'development' && (
                <p className="mt-4 text-center text-xs text-amber-600 dark:text-amber-400">
                  Dev: set <code className="font-mono">GOOGLE_CLIENT_ID</code> in{' '}
                  <code className="font-mono">.env.local</code>
                </p>
              )}
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground lg:hidden">
              {TRUST_POINTS.join(' · ')}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function SignInFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 landing-bg text-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  )
}
