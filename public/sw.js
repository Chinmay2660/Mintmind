const STATIC_CACHE = 'mintmind-static-v2'
const RUNTIME_CACHE = 'mintmind-runtime-v2'

const PRECACHE = ['/', '/offline.html', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/')
}

function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  )
}

async function cacheResponse(cacheName, request, response) {
  if (!response.ok) return response
  const cache = await caches.open(cacheName)
  await cache.put(request, response.clone())
  return response
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)
    return cacheResponse(RUNTIME_CACHE, request, response)
  } catch {
    const runtimeCache = await caches.open(RUNTIME_CACHE)
    const cached =
      (await runtimeCache.match(request)) ||
      (await runtimeCache.match('/dashboard')) ||
      (await caches.match('/offline.html'))
    if (cached) return cached
    throw new Error('offline')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isApiRequest(url)) return

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        return cacheResponse(STATIC_CACHE, request, response)
      })
    )
    return
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached
      const response = await fetch(request)
      return cacheResponse(RUNTIME_CACHE, request, response)
    })
  )
})
