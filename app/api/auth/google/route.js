import { NextResponse } from 'next/server'
import { getOrCreateGoogleUser, generateToken } from '@/lib/auth'

export async function POST(request) {
  try {
    const { idToken, accessToken, email, name, picture } = await request.json()
    
    let googleUser

    // If ID token is provided, verify it
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
      
      // Verify the token is from our app
      if (googleUser.aud !== process.env.GOOGLE_CLIENT_ID && googleUser.aud !== process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        return NextResponse.json(
          { error: 'Invalid token audience' },
          { status: 401 }
        )
      }
    } else if (accessToken) {
      // If access token is provided, fetch user info from Google
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
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to fetch user profile from Google' },
          { status: 500 }
        )
      }
    } else if (email) {
      // If direct user info is provided (from OAuth2 flow), use it
      googleUser = {
        sub: email, // Use email as identifier
        email: email,
        name: name || email.split('@')[0] || 'User',
        picture: picture || '',
      }
    } else {
      return NextResponse.json(
        { error: 'ID token, access token, or user info is required' },
        { status: 400 }
      )
    }

    // Get or create user
    const user = await getOrCreateGoogleUser({
      id: googleUser.sub || googleUser.id,
      sub: googleUser.sub || googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    })

    // Refresh user from database to ensure we have latest data
    await user.populate()
    
    // Generate JWT token with fresh user data
    const token = generateToken(user)

    // Create response with cookie
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

    // Set HTTP-only cookie
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return res
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

