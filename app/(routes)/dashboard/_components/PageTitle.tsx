'use client'

import { usePathname } from 'next/navigation'
import { getDashboardPageTitle } from '@/lib/constants/dashboardNav'
import { useDocumentTitle } from '@/lib/hooks/useDocumentTitle'

export default function PageTitle() {
  const pathname = usePathname()
  useDocumentTitle(getDashboardPageTitle(pathname))
  return null
}
