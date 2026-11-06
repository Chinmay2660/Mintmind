// Device notifications: reminders shown by the browser/OS while the app or installed PWA is running.
// Reminders are derived from data stored on this device, so there is no server push (and nothing leaves the device).

const FLAG = 'mm-device-notify'
const SEEN = 'mm-device-notify-seen'

export const deviceNotifySupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
export const deviceNotifyOn = () => { try { return deviceNotifySupported() && Notification.permission === 'granted' && localStorage.getItem(FLAG) === '1' } catch { return false } }

export async function enableDeviceNotify(): Promise<'on' | 'denied' | 'unsupported'> {
  if (!deviceNotifySupported()) return 'unsupported'
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  await navigator.serviceWorker.register('/sw.js')
  try { localStorage.setItem(FLAG, '1') } catch { /* ignore */ }
  return 'on'
}
export function disableDeviceNotify() { try { localStorage.removeItem(FLAG); localStorage.removeItem(SEEN) } catch { /* ignore */ } }

type N = { key: string; title: string; severity?: string; href?: string; module?: string; daysLeft?: number }

/** Shows each urgent reminder once per day (max 3 at a time). Returns how many were shown. */
export async function showDueNotifications(list: N[], max = 3) {
  if (!deviceNotifyOn()) return 0
  const today = new Date().toISOString().slice(0, 10)
  let seen: Record<string, string> = {}
  try { seen = JSON.parse(localStorage.getItem(SEEN) || '{}') } catch { /* ignore */ }
  const fresh = list.filter((n) => (n.severity === 'high' || n.severity === 'medium') && seen[n.key] !== today).slice(0, max)
  if (!fresh.length) return 0
  const reg = await navigator.serviceWorker.ready
  for (const n of fresh) {
    await reg.showNotification(n.title, { body: n.module ? `Mintmind · ${n.module}` : 'Mintmind', tag: n.key, icon: '/icon-192.png', data: { href: n.href || '/dashboard' } })
    seen[n.key] = today
  }
  // keep the record small: drop anything not seen today
  for (const k of Object.keys(seen)) if (seen[k] !== today) delete seen[k]
  try { localStorage.setItem(SEEN, JSON.stringify(seen)) } catch { /* ignore */ }
  return fresh.length
}
