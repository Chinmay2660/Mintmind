// Mintmind service worker: offline-first app shell.
//  - /_next/static (hashed, immutable): cache-first
//  - pages (navigations): network first with a short timeout, then the cached copy, then the offline page
//  - other same-origin GET files (icons, fonts, images): stale-while-revalidate
//  - /api and Next's RSC data requests are never intercepted (data lives in IndexedDB; Next falls back to a full page load)
const VERSION = 'v4'
const STATIC_CACHE = `mintmind-static-${VERSION}`
const RUNTIME_CACHE = `mintmind-runtime-${VERSION}`
const NETWORK_TIMEOUT_MS = 3500

const PRECACHE = ['/', '/offline.html', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Individually, so one missing file cannot stop the worker installing.
      await Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {})))
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

const isApiRequest = (url) => url.pathname.startsWith('/api/')
const isStaticAsset = (url) => url.pathname.startsWith('/_next/static/')
const isRscRequest = (request, url) => request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')
const isNavigationRequest = (request) =>
  request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))

async function put(cacheName, request, response) {
  // Redirected responses (e.g. /dashboard -> sign-in) can't be served for a navigation, and errors shouldn't be kept.
  if (!response || !response.ok || response.redirected) return response
  const cache = await caches.open(cacheName)
  await cache.put(request, response.clone())
  return response
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    fetch(request).then(
      (res) => { clearTimeout(timer); resolve(res) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

// Finds the hashed scripts/styles/fonts a cached page needs and stores them, so a page opened once also works offline.
async function cacheAssetsOf(html) {
  const found = new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) || [])
  const cache = await caches.open(STATIC_CACHE)
  await Promise.all(
    [...found].map(async (path) => {
      if (await cache.match(path)) return
      try {
        const res = await fetch(path)
        if (res.ok) await cache.put(path, res)
      } catch { /* ignore */ }
    })
  )
}

async function cachePage(url) {
  const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
  if (!res.ok || res.redirected) return false // signed out / not available
  await put(RUNTIME_CACHE, new Request(url), res.clone())
  await cacheAssetsOf(await res.text())
  return true
}

async function offlineFallback(request) {
  const runtime = await caches.open(RUNTIME_CACHE)
  const url = new URL(request.url)
  return (
    (await runtime.match(request, { ignoreSearch: true })) ||
    (await runtime.match(url.pathname)) ||
    (url.pathname.startsWith('/dashboard') ? await runtime.match('/dashboard') : undefined) ||
    (await runtime.match('/')) ||
    (await caches.match('/')) ||
    (await caches.match('/offline.html'))
  )
}

async function networkFirstNavigation(event) {
  const { request } = event
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
    if (response.ok && !response.redirected) {
      event.waitUntil(
        put(RUNTIME_CACHE, request, response.clone())
          .then(() => response.clone().text())
          .then(cacheAssetsOf)
          .catch(() => {})
      )
    }
    return response
  } catch {
    const cached = await offlineFallback(request)
    return cached || Response.error()
  }
}

async function staleWhileRevalidate(event) {
  const { request } = event
  const cached = await caches.match(request)
  // offline and nothing saved: answer with a network error, never undefined (respondWith needs a Response)
  const refresh = fetch(request).then((res) => put(RUNTIME_CACHE, request, res)).catch(() => cached || Response.error())
  if (cached) {
    event.waitUntil(refresh)
    return cached
  }
  return refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isApiRequest(url) || isRscRequest(request, url)) return
  if (url.pathname === '/sw.js') return

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) await cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(event))
    return
  }

  event.respondWith(staleWhileRevalidate(event))
})

self.addEventListener('message', (event) => {
  const data = event.data || {}
  if (data.type === 'WARM_CACHE' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        for (const u of data.urls) {
          try { await cachePage(u) } catch { /* offline or unavailable: skip */ }
        }
      })()
    )
  } else if (data.type === 'CLEAR_PRIVATE_CACHE') {
    event.waitUntil(caches.delete(RUNTIME_CACHE))
  } else if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Device notifications: open (or focus) the relevant page when one is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const href = (event.notification.data && event.notification.data.href) || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) if ('focus' in w) { w.navigate(href); return w.focus() }
      return self.clients.openWindow(href)
    })
  )
})
