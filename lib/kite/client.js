import crypto from 'crypto'
import KiteConnection from '@/models/KiteConnection'
import { decrypt, encrypt } from '@/lib/utils/crypto'

// Zerodha Kite Connect v3. Docs: https://kite.trade/docs/connect/v3/
const API = 'https://api.kite.trade'

export function kiteConfig() {
  const apiKey = process.env.KITE_API_KEY
  const apiSecret = process.env.KITE_API_SECRET
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  return { apiKey, apiSecret, appUrl, redirectUrl: `${appUrl}/api/kite/callback`, configured: !!(apiKey && apiSecret) }
}

export function loginUrl(state) {
  const { apiKey } = kiteConfig()
  // redirect_params is echoed back to our redirect URL: used for the CSRF state
  return `https://kite.zerodha.com/connect/login?v=3&api_key=${encodeURIComponent(apiKey)}&redirect_params=${encodeURIComponent(`state=${state}`)}`
}

/** Kite access tokens expire at ~6:00 AM IST the next day. */
export function nextExpiry(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600_000)
  const exp = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 6, 0, 0))
  if (ist.getTime() >= exp.getTime()) exp.setUTCDate(exp.getUTCDate() + 1)
  return new Date(exp.getTime() - 5.5 * 3600_000)
}

/** Exchanges the one-time request_token for an access token. checksum = sha256(api_key + request_token + api_secret). */
export async function createSession(requestToken) {
  const { apiKey, apiSecret } = kiteConfig()
  const checksum = crypto.createHash('sha256').update(apiKey + requestToken + apiSecret).digest('hex')
  const res = await fetch(`${API}/session/token`, {
    method: 'POST',
    headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ api_key: apiKey, request_token: requestToken, checksum }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Kite login failed')
  return json.data
}

export async function saveSession(userId, data) {
  return KiteConnection.findOneAndUpdate(
    { userId },
    { userId, accessTokenEnc: encrypt(data.access_token), kiteUserId: data.user_id, kiteUserName: data.user_name || data.user_shortname, connectedAt: new Date(), expiresAt: nextExpiry() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

export class KiteAuthError extends Error {
  constructor(message = 'Zerodha session expired. Log in again.') {
    super(message)
    this.code = 'KITE_AUTH'
  }
}

export async function getToken(userId) {
  const conn = await KiteConnection.findOne({ userId }).select('+accessTokenEnc')
  if (!conn) throw new KiteAuthError('Zerodha is not connected')
  if (conn.expiresAt && conn.expiresAt < new Date()) throw new KiteAuthError()
  return { token: decrypt(conn.accessTokenEnc), conn }
}

export async function kiteGet(token, path) {
  const { apiKey } = kiteConfig()
  const res = await fetch(`${API}${path}`, { headers: { 'X-Kite-Version': '3', Authorization: `token ${apiKey}:${token}` } })
  const json = await res.json().catch(() => ({}))
  if (res.status === 403 && json.error_type === 'TokenException') throw new KiteAuthError()
  if (!res.ok || json.status !== 'success') throw new Error(json.message || `Kite request failed (${res.status})`)
  return json.data
}

export async function invalidateSession(userId) {
  const { apiKey } = kiteConfig()
  try {
    const { token } = await getToken(userId)
    await fetch(`${API}/session/token?api_key=${encodeURIComponent(apiKey)}&access_token=${encodeURIComponent(token)}`, { method: 'DELETE', headers: { 'X-Kite-Version': '3' } })
  } catch {
    /* best effort: the token expires by itself anyway */
  }
}
