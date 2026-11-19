// PWA helpers: service worker registration, offline warm-up, and cache cleanup on sign-out.

const RUNTIME_CACHE_PREFIX = 'mintmind-runtime-'

// Pages worth having on the device so the installed app opens fully offline.
export const OFFLINE_ROUTES = [
  '/dashboard',
  '/dashboard/net-worth',
  '/dashboard/net-worth/manage',
  '/dashboard/bank-accounts',
  '/dashboard/credit-cards',
  '/dashboard/mutual-funds',
  '/dashboard/insurance',
  '/dashboard/budget',
  '/dashboard/documents',
  '/dashboard/vault',
  '/dashboard/legacy',
  '/dashboard/family',
  '/dashboard/tools',
  '/dashboard/ai',
  '/dashboard/settings',
]

export const pwaSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator

export async function registerServiceWorker() {
  if (!pwaSupported()) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

/** Asks the service worker to download the app pages and their scripts for offline use. */
export async function warmOfflineCache() {
  if (!pwaSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'WARM_CACHE', urls: OFFLINE_ROUTES })
  } catch {
    /* offline support is best-effort */
  }
}

/** Removes cached pages (which can reflect a signed-in user) so the next person on this device never sees them. */
export async function clearPrivateCaches() {
  if (typeof caches === 'undefined') return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k.startsWith(RUNTIME_CACHE_PREFIX)).map((k) => caches.delete(k)))
  } catch {
    /* ignore */
  }
}
