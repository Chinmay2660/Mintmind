'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Button } from '@/components/ui/button'

function Accept() {
  const token = useSearchParams().get('token') || ''
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error' | 'auth'>('idle')
  const [msg, setMsg] = useState('')

  const accept = async () => {
    setState('busy')
    try {
      await axios.post('/api/family-circle', { action: 'accept', token })
      setState('done')
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) return setState('auth')
      setMsg(axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Something went wrong')
      setState('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="surface-card w-full max-w-md space-y-4 p-6">
        <h1 className="text-xl font-semibold">Family Circle invitation</h1>
        {!token ? <p className="text-sm text-destructive">This invitation link is incomplete.</p> : state === 'done' ? (
          <><p className="text-sm">You&apos;ve joined the circle. By default you share nothing; choose what to share in Family Circle → My sharing.</p><Button asChild><Link href="/dashboard/family">Open Family Circle</Link></Button></>
        ) : state === 'auth' ? (
          <><p className="text-sm">Sign in (or sign up) with the email address that received this invitation, then open this link again.</p><Button asChild><Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/family/accept?token=${token}`)}`}>Sign in</Link></Button></>
        ) : (
          <><p className="text-sm text-muted-foreground">Joining lets family members see only the information you choose to share. Admins cannot see your data automatically.</p>
            {state === 'error' && <p role="alert" className="text-sm text-destructive">{msg}</p>}
            <Button onClick={accept} disabled={state === 'busy'}>Accept invitation</Button></>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><Accept /></Suspense>
}
