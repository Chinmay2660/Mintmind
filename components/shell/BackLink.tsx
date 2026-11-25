'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { canGoBackInApp } from '@/lib/navHistory'

/** A "back to the list" link that returns to the page the person came from when they came from inside the app, and goes to `href` otherwise. */
export function BackLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter()
  return (
    <Link href={href} className={className} onClick={(e) => { if (canGoBackInApp() && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); router.back() } }}>{children}</Link>
  )
}
