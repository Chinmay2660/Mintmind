// Google sign-in by redirect (no popup). Shared by the start and callback routes.

export function googleSignInConfig(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, '')
  return { clientId, clientSecret, appUrl, redirectUri: `${appUrl}/api/auth/google/callback`, configured: !!(clientId && clientSecret) }
}

/** Only same-site paths, so a sign-in link can never send someone to another site afterwards. */
export const safeNext = (v) => (typeof v === 'string' && /^\/(?!\/)[^\s\\]*$/.test(v) ? v : '/dashboard')

export const STATE_COOKIE = 'google-signin'
export const cookieOpts = (maxAge) => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge, path: '/api/auth/google' })
