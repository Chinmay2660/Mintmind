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
