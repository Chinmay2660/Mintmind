import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import UserFeatureSettings from '@/models/UserFeatureSettings'
import UserOnboarding from '@/models/UserOnboarding'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { getEnabledFeatures } from '@/lib/features/server'
import { FEATURE_KEYS, GOALS, PACKAGES, normaliseSelection, validateAge } from '@/lib/features'

const THEMES = ['light', 'dark', 'system']
const NOTIFS = ['daily', 'weekly', 'monthly', 'important']
const NEEDS = ['personal', 'family', 'investments', 'complete']

function present(enabled, onboarding) {
  return {
    onboardingCompleted: onboarding ? !!onboarding.onboardingCompleted : true, // legacy accounts are treated as set up
    legacy: !onboarding,
    enabled: [...enabled],
    profile: onboarding ? { age: onboarding.age ?? null, mobile: onboarding.mobile ?? '', preferredTheme: onboarding.preferredTheme, notificationPreference: onboarding.notificationPreference, selectedGoals: onboarding.selectedGoals, selectedPackage: onboarding.selectedPackage || null, trackingNeeds: onboarding.trackingNeeds || null } : null,
  }
}

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response
  const { enabled, onboarding } = await getEnabledFeatures(user._id)
  return NextResponse.json(present(enabled, onboarding))
}

/**
 * POST { action }
 *   complete-onboarding { selection[], goals[], package, age, mobile, theme, notifications, needs }
 *   set-feature { key, enabled, configuration? }
 *   update-profile { age, mobile, theme, notifications }
 * Preferences are per user. Switching a feature off never deletes its data.
 */
export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'features', limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  const b = await request.json().catch(() => ({}))
  await connectDB()

  const applyProfile = (target) => {
    if ('age' in b) {
      const a = validateAge(b.age)
      if (!a.ok) return a.error
      target.age = a.value ?? undefined
    }
    if (typeof b.mobile === 'string') {
      const m = b.mobile.trim()
      if (m && !/^\+?[0-9 ()-]{8,16}$/.test(m)) return 'Enter a valid mobile number'
      target.mobile = m
    }
    if (b.theme != null) { if (!THEMES.includes(b.theme)) return 'Invalid theme'; target.preferredTheme = b.theme }
    if (b.notifications != null) { if (!NOTIFS.includes(b.notifications)) return 'Invalid notification preference'; target.notificationPreference = b.notifications }
    return null
  }

  switch (b.action) {
    case 'complete-onboarding': {
      const selection = normaliseSelection(Array.isArray(b.selection) ? b.selection : [])
      const goals = (Array.isArray(b.goals) ? b.goals : []).filter((g) => GOALS.some((x) => x.key === g))
      const doc = (await UserOnboarding.findOne({ userId: user._id })) || new UserOnboarding({ userId: user._id })
      const err = applyProfile(doc)
      if (err) return NextResponse.json({ error: err }, { status: 400 })
      doc.selectedGoals = goals
      doc.selectedPackage = PACKAGES.some((p) => p.key === b.package) ? b.package : undefined
      doc.trackingNeeds = NEEDS.includes(b.needs) ? b.needs : undefined
      doc.onboardingCompleted = true
      doc.completedAt = new Date()
      await doc.save()
      for (const key of FEATURE_KEYS) {
        const on = selection.includes(key)
        await UserFeatureSettings.updateOne({ userId: user._id, featureKey: key }, { $set: { isEnabled: on, ...(on ? { enabledAt: new Date() } : {}) } }, { upsert: true })
      }
      return NextResponse.json(present(new Set(selection), doc))
    }
    case 'set-feature': {
      if (!FEATURE_KEYS.includes(b.key)) return NextResponse.json({ error: 'Unknown feature' }, { status: 400 })
      if (b.key === 'dashboard' && b.enabled === false) return NextResponse.json({ error: 'Dashboard & Net Worth is always on' }, { status: 400 })
      let doc = await UserOnboarding.findOne({ userId: user._id })
      if (!doc) {
        // first change on an account that predates feature selection: materialise "everything on", then apply the change
        doc = await UserOnboarding.create({ userId: user._id, onboardingCompleted: true, completedAt: new Date() })
        for (const key of FEATURE_KEYS) await UserFeatureSettings.updateOne({ userId: user._id, featureKey: key }, { $set: { isEnabled: true, enabledAt: new Date() } }, { upsert: true })
      }
      const set = { isEnabled: !!b.enabled, ...(b.enabled ? { enabledAt: new Date() } : {}) }
      if (b.configuration && typeof b.configuration === 'object') set.configuration = b.configuration
      await UserFeatureSettings.updateOne({ userId: user._id, featureKey: b.key }, { $set: set }, { upsert: true })
      const { enabled, onboarding } = await getEnabledFeatures(user._id)
      return NextResponse.json(present(enabled, onboarding))
    }
    case 'update-profile': {
      const doc = (await UserOnboarding.findOne({ userId: user._id })) || (await UserOnboarding.create({ userId: user._id, onboardingCompleted: true, completedAt: new Date() }))
      const err = applyProfile(doc)
      if (err) return NextResponse.json({ error: err }, { status: 400 })
      await doc.save()
      const { enabled, onboarding } = await getEnabledFeatures(user._id)
      return NextResponse.json(present(enabled, onboarding))
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
