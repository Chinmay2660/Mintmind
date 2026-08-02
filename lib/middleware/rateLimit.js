const buckets = new Map()

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpired(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key)
  }
}

/**
 * Sliding-window rate limiter.
 * @returns {{ limited: boolean, retryAfter?: number, remaining?: number }}
 */
export function checkRateLimit(key, { limit = 60, windowMs = 60_000 } = {}) {
  const now = Date.now()
  cleanupExpired(now)

  let bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs }
  }

  bucket.count += 1
  buckets.set(key, bucket)

  if (bucket.count > limit) {
    return { limited: true, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  return { limited: false, remaining: limit - bucket.count }
}

export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
