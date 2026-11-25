'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { Loader2, MailCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/wealth/kit'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const { data } = await axios.post('/api/auth/forgot', { email })
      setMessage(data.message)
    } catch (err) {
      setError(axios.isAxiosError(err) && err.response?.data?.error ? String(err.response.data.error) : 'Could not send the email. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Wallet className="h-5 w-5" aria-hidden /></span>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted-foreground">Enter the email you signed up with. We will send a link that works for one hour.</p>
        </div>
        <div className="surface-card p-5">
          {message ? (
            <div className="space-y-3 text-center" role="status">
              <MailCheck className="mx-auto h-8 w-8 text-primary" aria-hidden />
              <p className="text-sm">{message}</p>
              <p className="text-xs text-muted-foreground">Nothing arrived? Check spam, or try again in a few minutes. Signed up with Google? Use Continue with Google instead, there is no password to reset.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />}</Field>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send reset link</Button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-sm"><Link href="/auth/signin" className="font-medium text-primary hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  )
}
