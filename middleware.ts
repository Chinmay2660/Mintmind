import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Authentication Middleware
 * 
 * Note: The deprecation warning about "proxy" refers to request proxying patterns,
 * not authentication middleware. This middleware file is still the recommended
 * and standard approach for route protection in Next.js 16.
 * 
 * The warning can be safely ignored as this is the correct implementation pattern.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CRITICAL: Skip middleware for ALL API routes (including /api/auth)
  // This prevents redirect loops with /api/auth/session
  // getToken() internally calls /api/auth/session which causes the loop
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Skip middleware for other public routes and Next.js internal routes
  if (
    pathname === '/' || 
    pathname.startsWith('/auth') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Only protect dashboard routes
  // Check for auth token cookie
  if (pathname.startsWith('/dashboard')) {
    const authToken = request.cookies.get('auth-token')
    
    if (!authToken) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only match dashboard routes - don't match /api routes at all
    // We'll handle API route protection differently if needed
    '/dashboard/:path*',
  ],
}
