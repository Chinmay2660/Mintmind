'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { CheckCircle2, Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/wealth/kit'

function ResetForm() {
  const token = useSearchParams().get('token') || ''
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== again) return setError('The two passwords do not match.')
    setError(''); setBusy(true)
    try {
      await axios.post('/api/auth/reset', { token, password })
      setDone(true)
    } catch (err) {
      setError(axios.isAxiosError(err) && err.response?.data?.error ? String(err.response.data.error) : 'Could not reset the password. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Wallet className="h-5 w-5" aria-hidden /></span>
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        </div>
        <div className="surface-card p-5">
          {done ? (
            <div className="space-y-3 text-center" role="status">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden />
              <p className="text-sm">Your password is changed. For safety you were signed out everywhere.</p>
              <Button asChild className="w-full"><Link href="/auth/signin">Sign in</Link></Button>
            </div>
          ) : !token ? (
            <p className="text-sm">This link is missing its code. <Link href="/auth/forgot" className="font-medium text-primary hover:underline">Ask for a new reset link</Link>.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="New password" hint="At least 10 characters with upper/lower case, numbers or symbols.">{(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" autoFocus />}</Field>
              <Field label="Type it again">{(id) => <Input id={id} type="password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={10} autoComplete="new-password" />}</Field>
              {error && <p role="alert" className="text-sm text-destructive">{error} {/expired|not valid/.test(error) && <Link href="/auth/forgot" className="font-medium text-primary hover:underline">Get a new link</Link>}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Change password</Button>
            </form>
          )}
        </div>
        {!done && <p className="mt-4 text-center text-sm"><Link href="/auth/signin" className="font-medium text-primary hover:underline">Back to sign in</Link></p>}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div>}><ResetForm /></Suspense>
}
