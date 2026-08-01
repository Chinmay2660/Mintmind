import { NextResponse } from 'next/server'
import { getOrCreateGoogleUser, generateToken } from '@/lib/auth'
import { rateLimitOrRespond } from '@/lib/middleware/api'

export async function POST(request) {
  const rateLimited = rateLimitOrRespond(request, {
    name: 'auth-google',
    limit: 10,
    windowMs: 15 * 60 * 1000,
  })
  if (rateLimited) return rateLimited

  try {
    const { idToken, accessToken } = await request.json()
    
    let googleUser

    if (idToken) {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      )
      
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Invalid Google token' },
          { status: 401 }
        )
      }

      googleUser = await response.json()
      
      if (googleUser.aud !== process.env.GOOGLE_CLIENT_ID && googleUser.aud !== process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        return NextResponse.json(
          { error: 'Invalid token audience' },
          { status: 401 }
        )
      }
    } else if (accessToken) {
      try {
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
        
        if (!userInfoResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to fetch user info from Google' },
            { status: 401 }
          )
        }
        
        const userInfo = await userInfoResponse.json()
        googleUser = {
          sub: userInfo.id || userInfo.email,
          email: userInfo.email,
          name: userInfo.name || userInfo.email?.split('@')[0] || 'User',
          picture: userInfo.picture || '',
        }
      } catch {
        return NextResponse.json(
          { error: 'Failed to fetch user profile from Google' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'ID token or access token is required' },
        { status: 400 }
      )
    }

    const user = await getOrCreateGoogleUser({
      id: googleUser.sub || googleUser.id,
      sub: googleUser.sub || googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    })

    await user.populate()
    
    const token = generateToken(user)

    const res = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
      },
    })

    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    return res
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
