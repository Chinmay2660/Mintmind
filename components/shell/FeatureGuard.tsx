'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FEATURES, featureByKey, featureForPath } from '@/lib/features'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { DASHBOARD_NAV_ALL, type DashboardNavItem } from '@/lib/constants/dashboardNav'
import { iconFor } from '@/components/onboarding/icons'
import { Button } from '@/components/ui/button'
import { LoadingBlock } from '@/components/wealth/kit'

/** Sends people who haven't chosen features to onboarding, and shows a clear page for a feature that is switched off. */
export function FeatureGuard({ children }: { children: ReactNode }) {
  const { ready, onboardingCompleted, isEnabled, setFeature } = useFeatures()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (ready && !onboardingCompleted) router.replace('/onboarding')
  }, [ready, onboardingCompleted, router])

  if (!ready || !onboardingCompleted) return <LoadingBlock className="h-72" />
  const key = featureForPath(pathname)
  // The Vault hub holds passwords, documents and digital legacy: it opens if any of them is on.
  const vaultHub = key === 'vault' && (isEnabled('documents') || isEnabled('digital_legacy'))
  if (key && !isEnabled(key) && !vaultHub) {
    const f = featureByKey(key)!
    const Icon = iconFor(f.icon)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-6 w-6" /></span>
        <h2 className="mt-4 text-xl font-semibold">{f.name} is turned off</h2>
        <p className="mt-1 text-sm text-muted-foreground">{f.description} Turning it on brings it back to your menu and dashboard. Anything you added before is still there.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={async () => { try { await setFeature(key, true); toast.success(`${f.name} is on`) } catch { toast.error('Could not turn it on') } }}>Turn on</Button>
          <Button asChild variant="outline"><Link href="/dashboard/settings?tab=features">My App Features</Link></Button>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

/** Nav items for enabled features only. Settings is always there; dashboard modules are always there. */
export function useVisibleNav() {
  const { isEnabled } = useFeatures()
  const all = DASHBOARD_NAV_ALL.filter((i) => { const k = featureForPath(i.path); return !k || isEnabled(k) || (k === 'vault' && (isEnabled('documents') || isEnabled('digital_legacy'))) })
  // bottom bar: first four of the usual favourites that are on; everything else goes under More
  const favourites = [1, 2, 3, 7, 4, 5, 6]
  const main: DashboardNavItem[] = favourites.map((id) => all.find((i) => i.id === id)).filter(Boolean).slice(0, 4) as DashboardNavItem[]
  const more = all.filter((i) => !main.includes(i))
  return { all, main, more }
}

export { FEATURES }
