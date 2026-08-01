import { useEffect } from 'react'
import { APP_NAME } from '@/lib/constants/dashboardNav'

export function formatDocumentTitle(...segments: string[]): string {
  const parts = segments.filter(Boolean)
  if (parts.length === 0) return APP_NAME
  return `${parts.join(' | ')} | ${APP_NAME}`
}

export function useDocumentTitle(...segments: string[]) {
  const title = formatDocumentTitle(...segments)

  useEffect(() => {
    document.title = title
  }, [title])
}
