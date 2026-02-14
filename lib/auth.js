import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  const tokenData = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
  }
  
  return jwt.sign(tokenData, JWT_SECRET, { expiresIn: '30d' })
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

/**
 * Get or create user from Google OAuth
 */
export async function getOrCreateGoogleUser(googleUser) {
  await connectDB()
  
  // Parse name into firstName and lastName
  const nameParts = (googleUser.name || '').trim().split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''
  
  // Use sub (Google user ID) as googleId
  const googleId = googleUser.sub || googleUser.id
  
  if (!googleUser.email) {
    throw new Error('Email is required from Google OAuth')
  }
  
  let user = await User.findOne({ email: googleUser.email })
  
  if (!user) {
    // Create new user
    user = await User.create({
      googleId: googleId,
      email: googleUser.email,
      name: googleUser.name || googleUser.email?.split('@')[0] || 'User',
      firstName: firstName,
      lastName: lastName,
      image: googleUser.picture || '',
    })
  } else {
    // Update existing user with Google ID and profile info
    if (!user.googleId && googleId) {
      user.googleId = googleId
    }
    // Always update name and image if provided (in case user changed their Google profile)
    if (googleUser.name) {
      user.name = googleUser.name
    }
    if (firstName) {
      user.firstName = firstName
    }
    if (lastName) {
      user.lastName = lastName
    }
    if (googleUser.picture) {
      user.image = googleUser.picture
    }
    await user.save()
  }
  
  return user
}

/**
 * Get user from session token
 */
export async function getUserFromToken(token) {
  if (!token) return null
  
  const decoded = verifyToken(token)
  if (!decoded) return null
  
  await connectDB()
  const user = await User.findById(decoded.id)
  
  // Ensure name is always set - use email as fallback
  if (user && !user.name && user.email) {
    user.name = user.email.split('@')[0]
    await user.save()
  }
  
  return user
}
