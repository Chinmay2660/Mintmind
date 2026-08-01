'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import '@/lib/offline/selfCheck'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <OfflineProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
