'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { toast } from 'sonner'
import { Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function errMsg(e: unknown, fallback: string) {
  return axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : fallback
}

type Mode = 'login' | 'signup'

function SignInContent() {
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/dashboard'
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [needMfa, setNeedMfa] = useState(false)
  const [busy, setBusy] = useState<null | 'form' | 'google' | 'demo'>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.get('error')) setError('Authentication failed. Please try again.')
  }, [params])

  // Load Google Identity Services only if configured
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined' || window.google) return
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    document.head.appendChild(s)
  }, [])

  const go = () => {
    window.location.href = callbackUrl
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy('form')
    try {
      if (mode === 'signup') {
        await axios.post('/api/auth/register', { name, email, password })
        toast.success('Account created')
        go()
      } else {
        const { data } = await axios.post('/api/auth/login', { email, password, totp: needMfa ? totp : undefined })
        if (data.mfaRequired) {
          setNeedMfa(true)
          setBusy(null)
          return
        }
        go()
      }
    } catch (err) {
      const msg = errMsg(err, 'Something went wrong. Please try again.')
      setError(msg)
      setBusy(null)
    }
  }

  const google = () => {
    setError('')
    if (!GOOGLE_CLIENT_ID) return setError('Google sign-in isn’t available right now. Use email and password instead.')
    if (!window.google?.accounts) return setError('Google sign-in is still loading. Try again in a moment.')
    setBusy('google')
    window.google.accounts.oauth2
      .initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (resp) => {
          if (resp.error || !resp.access_token) {
            setError('Google sign-in was cancelled or failed.')
            setBusy(null)
            return
          }
          try {
            await axios.post('/api/auth/google', { accessToken: resp.access_token })
            go()
          } catch (err) {
            setError(errMsg(err, 'Google sign-in failed.'))
            setBusy(null)
          }
        },
      })
      .requestAccessToken()
  }

  const demo = async () => {
    setError('')
    setBusy('demo')
    try {
      await axios.post('/api/auth/demo')
      window.location.href = '/dashboard'
    } catch {
      setError('Could not start the demo. Please try again.')
      setBusy(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mintmind</h1>
            <p className="text-sm text-muted-foreground">Your personal and family wealth, in one place.</p>
          </div>
        </div>

        <div className="surface-card p-6">
          <div role="tablist" aria-label="Authentication" className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError('')
                  setNeedMfa(false)
                }}
                className={cn('rounded-md py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring', mode === m ? 'bg-card shadow-card' : 'text-muted-foreground')}
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate={false}>
            {mode === 'signup' && (
              <Field label="Full name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />}</Field>
            )}
            <Field label="Email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />}</Field>
            <Field label="Password" hint={mode === 'signup' ? 'At least 10 characters with upper/lower case, numbers or symbols.' : undefined}>
              {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'signup' ? 10 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />}
            </Field>
            {needMfa && (
              <Field label="Authentication code" hint="Enter the 6-digit code from your authenticator app.">
                {(id) => <Input id={id} inputMode="numeric" pattern="\d{6}" maxLength={6} value={totp} onChange={(e) => setTotp(e.target.value)} required autoFocus autoComplete="one-time-code" />}
              </Field>
            )}
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy !== null}>
              {busy === 'form' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? (needMfa ? 'Verify and sign in' : 'Sign in') : 'Sign up'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2.5">
            <Button type="button" variant="outline" className="w-full gap-2" onClick={google} disabled={busy !== null}>
              {busy === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={demo} disabled={busy !== null}>
              {busy === 'demo' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Explore Demo Account
            </Button>
            <p className="text-center text-xs text-muted-foreground">Demo needs no sign-up. It uses sample data stored only in your browser.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  )
}
