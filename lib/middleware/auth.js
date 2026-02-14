import { getUserFromToken } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * Get authenticated user from JWT token
 * Returns user object or null if not found/authenticated
 */
export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return null
    }

    const user = await getUserFromToken(token)
    return user
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}
