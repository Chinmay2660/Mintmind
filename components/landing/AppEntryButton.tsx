'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { Button } from '@/components/ui/button'

/** Header button: "Open Mintmind" for visitors, "Go to dashboard" when already signed in (or in demo). */
export function AppEntryButton() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    axios.get('/api/auth/session').then((r) => setSignedIn(!!r.data?.user)).catch(() => {})
  }, [])
  return (
    <Button asChild size="sm" className="rounded-full">
      <Link href={signedIn ? '/dashboard' : '/auth/signin?mode=signup'}>{signedIn ? 'Go to dashboard' : 'Open Mintmind'}</Link>
    </Button>
  )
}
