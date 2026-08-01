import { NextResponse } from 'next/server'
import BankAccount from '@/models/BankAccount'
import Category from '@/models/Category'
import { getAuthenticatedUser } from './auth'
import { checkRateLimit, getClientIp } from './rateLimit'

export async function requireAuth() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, response: null }
}

export function rateLimitOrRespond(request, { name, limit = 60, windowMs = 60_000 }) {
  const ip = getClientIp(request)
  const result = checkRateLimit(`${name}:${ip}`, { limit, windowMs })
  if (result.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
    )
  }
  return null
}

export function pick(obj, keys) {
  const result = {}
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key]
  }
  return result
}

export function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
  }
}

export function safeErrorResponse(error, fallback = 'Internal server error') {
  console.error(error)
  const message = process.env.NODE_ENV === 'production' ? fallback : error.message
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function assertAccountOwnership(userId, accountId) {
  if (!accountId) return null
  return BankAccount.findOne({ _id: accountId, userId })
}

export async function assertCategoryOwnership(userId, categoryId) {
  if (!categoryId) return null
  return Category.findOne({ _id: categoryId, userId })
}
