let connected = typeof navigator !== 'undefined' ? navigator.onLine : true
const listeners = new Set()
let initialized = false

function setConnected(value) {
  if (connected === value) return
  connected = value
  listeners.forEach((callback) => callback(value))
}

export function isOnline() {
  return connected
}

export function onConnectivityChange(callback) {
  listeners.add(callback)
  callback(connected)
  return () => {
    listeners.delete(callback)
  }
}

export async function initNetworkMonitoring() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  const handleBrowserOnline = () => setConnected(true)
  const handleBrowserOffline = () => setConnected(false)

  window.addEventListener('online', handleBrowserOnline)
  window.addEventListener('offline', handleBrowserOffline)

  try {
    const { Network } = await import('@capacitor/network')
    const status = await Network.getStatus()
    setConnected(status.connected)
    await Network.addListener('networkStatusChange', (next) => setConnected(next.connected))
  } catch {
    setConnected(navigator.onLine)
  }
}

export async function initAppResumeSync(onResume) {
  if (typeof window === 'undefined' || !onResume) return () => {}

  const handleResume = () => {
    if (isOnline()) onResume()
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') handleResume()
  }

  document.addEventListener('visibilitychange', onVisible)

  let removeCapacitorListener = () => {}

  try {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) handleResume()
    })
    removeCapacitorListener = () => handle.remove()
  } catch {
    // web-only: visibilitychange is enough
  }

  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    removeCapacitorListener()
  }
}
