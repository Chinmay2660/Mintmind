'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import '@/lib/offline/selfCheck'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <OfflineProvider>
          <SidebarProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </SidebarProvider>
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
