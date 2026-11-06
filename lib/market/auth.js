import crypto from 'crypto'

/** Bearer check for internal endpoints, in constant time. */
export function isCronAuthorised(request) {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization') || ''
  const want = `Bearer ${secret}`
  return !!secret && given.length === want.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want))
}
