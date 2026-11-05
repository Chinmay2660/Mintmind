'use client'

import type { ReactNode } from 'react'
import { WealthProvider } from '@/lib/wealth/WealthContext'
import { FeaturesProvider } from '@/lib/features/FeaturesContext'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <WealthProvider>
      <FeaturesProvider>{children}</FeaturesProvider>
    </WealthProvider>
  )
}
