import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/middleware/rateLimit'

function applySecurityHeaders(response: NextResponse, frameable = false) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Document previews are shown in a frame on our own pages, so those files may be framed by this site only.
  response.headers.set('X-Frame-Options', frameable ? 'SAMEORIGIN' : 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    const ip = getClientIp(request)
    const result = checkRateLimit(`api:${ip}`, { limit: 120, windowMs: 60_000 })
    if (result.limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
      )
    }
    return applySecurityHeaders(NextResponse.next(), pathname.startsWith('/api/drive/files/'))
  }

  // '/' is always the public landing page; signed-in users reach the app via the "Go to dashboard" button.
  if (pathname === '/') return applySecurityHeaders(NextResponse.next())

  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return applySecurityHeaders(NextResponse.next())
  }

  if (pathname.startsWith('/dashboard') || pathname === '/onboarding') {
    const authToken = request.cookies.get('auth-token') || request.cookies.get('mm-demo')

    if (!authToken) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/onboarding', '/api/:path*'],
}
