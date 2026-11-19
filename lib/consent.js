// Cookie and storage choices. Pure helpers, no framework.
// There are two groups:
//   essential    keeps you signed in, remembers demo mode, holds your records on this device and counts failed vault attempts. Always on.
//   preferences  remembers theme, sidebar state, planning inputs and device notification choices between visits. Off if you decline.
// Nothing is used for advertising or analytics, and nothing is sent to a third party.

export const CONSENT_KEY = 'mm-consent'
export const CONSENT_EVENT = 'mm:consent-changed'
export const OPEN_COOKIE_SETTINGS = 'mm:open-cookie-settings'
export const CONSENT_VERSION = 1

/** Storage keys that only exist to remember a preference. */
export const PREFERENCE_KEYS = ['mm-theme', 'mm-sidebar-collapsed', 'mm-sidebar-open', 'mm-plan-inputs', 'mm-device-notify', 'mm-device-notify-seen']

export function readConsent() {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    return c && c.v === CONSENT_VERSION && typeof c.preferences === 'boolean' ? c : null
  } catch { return null }
}

/** True when a preference may be remembered. Until the person chooses, nothing optional is stored. */
export const canStorePreferences = () => readConsent()?.preferences === true

export function clearPreferenceKeys() {
  try { for (const k of PREFERENCE_KEYS) localStorage.removeItem(k) } catch { /* storage blocked */ }
}

export function writeConsent(preferences) {
  const value = { v: CONSENT_VERSION, preferences: !!preferences, at: new Date().toISOString() }
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)) } catch { /* storage blocked: the choice lasts for this visit only */ }
  if (!preferences) clearPreferenceKeys()
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }))
  return value
}
