'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import '@/lib/offline/selfCheck'

interface ProvidersProps {
  children: ReactNode
}

// ponytail: next-themes injects a <script> for FOUC prevention; React 19 warns on
// client re-render. type="application/json" on client only silences the warning —
// the script already ran during SSR and doesn't execute on client anyway.
const themeScriptProps =
  typeof window === 'undefined' ? undefined : ({ type: 'application/json' } as const)

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      scriptProps={themeScriptProps}
    >
      <AuthProvider>
        <OfflineProvider>
          <SidebarProvider>
            <ErrorBoundary>
              <ServiceWorkerRegistration />
              {children}
            </ErrorBoundary>
          </SidebarProvider>
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
