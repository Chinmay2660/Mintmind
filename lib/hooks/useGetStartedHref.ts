'use client'

import { useAuth } from '@/lib/hooks/useAuth'

export function useGetStartedHref(): string {
  const { user } = useAuth()
  return user ? '/dashboard' : '/auth/signin'
}
