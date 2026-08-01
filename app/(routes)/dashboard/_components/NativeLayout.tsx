'use client'
import { useEffect, useState } from 'react'
import { isNativePlatform } from '@/lib/platform'
import NativeOnboarding from './NativeOnboarding'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function NativeLayout({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    const native = isNativePlatform()
    setIsNative(native)

    // Check if user has seen onboarding
    if (native && !user) {
      const hasSeenOnboarding = localStorage.getItem('mintmind_onboarding_seen')
      if (!hasSeenOnboarding) {
        setShowOnboarding(true)
      }
    }
  }, [user])

  const handleOnboardingComplete = () => {
    localStorage.setItem('mintmind_onboarding_seen', 'true')
    setShowOnboarding(false)
  }

  if (isNative && showOnboarding) {
    return <NativeOnboarding onComplete={handleOnboardingComplete} />
  }

  return <>{children}</>
}

