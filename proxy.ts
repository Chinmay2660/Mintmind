import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/middleware/rateLimit'
import { isForgedOrigin } from '@/lib/middleware/origin'
import { isRetiredApi } from '@/lib/middleware/legacyApi'

function applySecurityHeaders(response: NextResponse, frameable = false) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Document previews are shown in a frame on our own pages, so those files may be framed by this site only.
  response.headers.set('X-Frame-Options', frameable ? 'SAMEORIGIN' : 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    if (isRetiredApi(pathname)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (isForgedOrigin(request.method, request.headers.get('origin'), request.headers.get('host'))) {
      return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 })
    }
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

  // '/' is the public landing page. On a phone, someone who is already signed in goes straight to Spend (transactions and budgets);
  // "Landing page" in the profile menu links to /?home=1 to still reach it. Everyone else sees the landing page.
  if (pathname === '/') {
    const phone = /Android|iPhone|iPad|iPod|Mobile/i.test(request.headers.get('user-agent') || '')
    const signedIn = request.cookies.get('auth-token') || request.cookies.get('mm-demo')
    if (phone && signedIn && !request.nextUrl.searchParams.has('home')) return NextResponse.redirect(new URL('/dashboard/budget', request.url))
    return applySecurityHeaders(NextResponse.next())
  }

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
