'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import axios from 'axios'
import { useTheme } from 'next-themes'
import { useWealth } from '@/lib/wealth/WealthContext'
import { FEATURE_KEYS, normaliseSelection } from '@/lib/features'

export interface OnboardingProfile { age: number | null; mobile: string; preferredTheme: 'light' | 'dark' | 'system'; notificationPreference: 'daily' | 'weekly' | 'monthly' | 'important'; selectedGoals: string[]; selectedPackage: string | null; trackingNeeds: string | null }
export interface OnboardingPayload { selection: string[]; goals: string[]; package?: string | null; needs?: string | null; age?: number | null; mobile?: string; theme?: string; notifications?: string }

interface Ctx {
  ready: boolean
  enabled: Set<string>
  onboardingCompleted: boolean
  profile: OnboardingProfile | null
  isEnabled: (key: string) => boolean
  setFeature: (key: string, on: boolean) => Promise<void>
  completeOnboarding: (p: OnboardingPayload) => Promise<void>
  updateProfile: (p: Partial<{ age: number | null; mobile: string; theme: string; notifications: string }>) => Promise<void>
}

const FeaturesCtx = createContext<Ctx | null>(null)
const ALL = new Set(FEATURE_KEYS)

/**
 * Per-user feature switches. Real accounts keep them on the server (and the server enforces them on its APIs);
 * Demo Mode keeps its own copy in the demo database, so the two can never mix.
 */
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { ready: wealthReady, isDemo, db, data, profileId } = useWealth()
  const { setTheme } = useTheme()
  const [remote, setRemote] = useState<{ enabled: string[]; onboardingCompleted: boolean; profile: OnboardingProfile | null } | null>(null)
  const themed = useRef(false)

  useEffect(() => {
    if (!profileId || isDemo) { setRemote(null); return }
    axios.get('/api/features').then((r) => setRemote(r.data)).catch(() => setRemote({ enabled: [...ALL], onboardingCompleted: true, profile: null }))
  }, [profileId, isDemo])

  const demoFeatures = data.meta.find((m: any) => m.key === 'features')?.value as { enabled: string[] } | undefined
  const demoOnboarding = data.meta.find((m: any) => m.key === 'onboarding')?.value as { completed: boolean; profile: OnboardingProfile } | undefined

  const state = useMemo(() => {
    if (isDemo) return { ready: wealthReady, enabled: new Set(demoFeatures ? normaliseSelection(demoFeatures.enabled) : FEATURE_KEYS), onboardingCompleted: !!demoOnboarding?.completed, profile: demoOnboarding?.profile ?? null }
    return { ready: !!remote, enabled: new Set(remote ? normaliseSelection(remote.enabled) : FEATURE_KEYS), onboardingCompleted: remote?.onboardingCompleted ?? true, profile: remote?.profile ?? null }
  }, [isDemo, wealthReady, demoFeatures, demoOnboarding, remote])

  // the chosen theme follows the account to other devices
  useEffect(() => {
    if (!state.ready || themed.current || !state.profile?.preferredTheme || !state.onboardingCompleted) return
    themed.current = true
    setTheme(state.profile.preferredTheme)
  }, [state, setTheme])

  const setFeature = useCallback(async (key: string, on: boolean) => {
    if (key === 'dashboard') return
    if (isDemo) {
      const next = normaliseSelection(on ? [...state.enabled, key] : [...state.enabled].filter((k) => k !== key))
      await db.meta.put({ key: 'features', value: { enabled: next } })
    } else {
      const r = await axios.post('/api/features', { action: 'set-feature', key, enabled: on })
      setRemote(r.data)
    }
  }, [isDemo, db, state.enabled])

  const completeOnboarding = useCallback(async (p: OnboardingPayload) => {
    const selection = normaliseSelection(p.selection)
    if (isDemo) {
      await db.meta.put({ key: 'features', value: { enabled: selection } })
      await db.meta.put({ key: 'onboarding', value: { completed: true, profile: { age: p.age ?? null, mobile: p.mobile ?? '', preferredTheme: (p.theme as any) || 'system', notificationPreference: (p.notifications as any) || 'important', selectedGoals: p.goals, selectedPackage: p.package ?? null, trackingNeeds: p.needs ?? null } } })
    } else {
      const r = await axios.post('/api/features', { action: 'complete-onboarding', ...p, selection })
      setRemote(r.data)
    }
  }, [isDemo, db])

  const updateProfile = useCallback(async (p: Partial<{ age: number | null; mobile: string; theme: string; notifications: string }>) => {
    if (isDemo) {
      const cur = demoOnboarding ?? { completed: false, profile: { age: null, mobile: '', preferredTheme: 'system', notificationPreference: 'important', selectedGoals: [], selectedPackage: null, trackingNeeds: null } }
      await db.meta.put({ key: 'onboarding', value: { ...cur, profile: { ...cur.profile, ...('age' in p ? { age: p.age ?? null } : {}), ...(p.mobile != null ? { mobile: p.mobile } : {}), ...(p.theme ? { preferredTheme: p.theme } : {}), ...(p.notifications ? { notificationPreference: p.notifications } : {}) } } })
    } else {
      const r = await axios.post('/api/features', { action: 'update-profile', ...p })
      setRemote(r.data)
    }
  }, [isDemo, db, demoOnboarding])

  const value = useMemo<Ctx>(() => ({ ...state, isEnabled: (k) => k === 'dashboard' || state.enabled.has(k), setFeature, completeOnboarding, updateProfile }), [state, setFeature, completeOnboarding, updateProfile])
  return <FeaturesCtx.Provider value={value}>{children}</FeaturesCtx.Provider>
}

export function useFeatures(): Ctx {
  const v = useContext(FeaturesCtx)
  if (!v) throw new Error('useFeatures must be used inside <FeaturesProvider>')
  return v
}
