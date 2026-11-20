'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import { PrivacyProvider } from '@/contexts/PrivacyContext'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import TruncationTitles from '@/components/TruncationTitles'
import CookieConsent from '@/components/CookieConsent'
import { SplashScreen } from '@/components/shell/SplashScreen'

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
      defaultTheme="light"
      storageKey="mm-theme"
      enableSystem
      scriptProps={themeScriptProps}
    >
      <AuthProvider>
        <PrivacyProvider>
          <SplashScreen />
          <ServiceWorkerRegister />
          <TruncationTitles />
          <CookieConsent />
          <ErrorBoundary>{children}</ErrorBoundary>
        </PrivacyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
