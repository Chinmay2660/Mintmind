import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import UserFeatureSettings from '@/models/UserFeatureSettings'
import UserOnboarding from '@/models/UserOnboarding'
import { FEATURE_KEYS } from '@/lib/features'

/**
 * Enabled feature keys for a real user. Accounts that existed before feature selection (no onboarding record)
 * keep every feature, so nothing disappears for them.
 */
export async function getEnabledFeatures(userId) {
  await connectDB()
  const onboarding = await UserOnboarding.findOne({ userId })
  if (!onboarding) return { enabled: new Set(FEATURE_KEYS), onboarding: null }
  const rows = await UserFeatureSettings.find({ userId, isEnabled: true })
  const enabled = new Set(rows.map((r) => r.featureKey))
  enabled.add('dashboard')
  return { enabled, onboarding }
}

/** Server-side gate: returns a 403 response when the feature is switched off for this user, otherwise null. */
export async function featureGate(userId, key) {
  const { enabled } = await getEnabledFeatures(userId)
  if (enabled.has(key)) return null
  return NextResponse.json({ error: 'This feature is turned off in My App Features', code: 'FEATURE_DISABLED', feature: key }, { status: 403 })
}
