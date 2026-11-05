import crypto from 'crypto'
import { promisify } from 'util'

// async scrypt runs on the libuv thread pool, so hashing never blocks other requests (scryptSync would)
const scrypt = promisify(crypto.scrypt)

// scrypt (memory-hard, built into Node) with per-user random salt and constant-time compare.
const KEYLEN = 64
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = await scrypt(password, salt, KEYLEN, PARAMS)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  if (!stored) return false
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, PARAMS)
  return crypto.timingSafeEqual(actual, expected)
}

/** Min 10 chars, at least 3 of: lower, upper, digit, symbol. */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 10) return 'Password must be at least 10 characters'
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length
  if (kinds < 3) return 'Use a mix of upper/lower case letters, numbers and symbols'
  return null
}
