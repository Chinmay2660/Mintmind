const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Cross-site request forgery guard for the JSON API. A browser always sends Origin on a cross-site POST/PUT/PATCH/DELETE,
 * so a request that names a different site is refused. Requests with no Origin (server to server, curl, the scheduler with its
 * bearer secret) are not browser forgeries and are left to their own authentication.
 */
export function isForgedOrigin(method, originHeader, hostHeader) {
  if (SAFE.has(String(method).toUpperCase())) return false
  if (!originHeader) return false
  if (originHeader === 'null') return true
  try { return new URL(originHeader).host !== hostHeader } catch { return true }
}
