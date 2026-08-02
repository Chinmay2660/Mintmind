'use client'

import { useLayoutEffect } from 'react'
import { scrollPageToTop } from '@/lib/utils/scroll'

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    scrollPageToTop()
  }, [])

  return <>{children}</>
}
