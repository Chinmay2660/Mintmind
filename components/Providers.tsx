'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import { PrivacyProvider } from '@/contexts/PrivacyContext'
import { IdleTimeoutProvider } from '@/contexts/IdleTimeoutContext'

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
        <PrivacyProvider>
          <IdleTimeoutProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </IdleTimeoutProvider>
        </PrivacyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
