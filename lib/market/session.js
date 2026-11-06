import connectDB from '@/lib/mongodb'
import MarketMeta from '@/models/MarketMeta'
import { decrypt, encrypt } from '@/lib/utils/crypto'
import { nextExpiry } from '@/lib/kite/client'

/** The single app-level Kite session. Kite tokens last one trading day, so the owner signs in on the day a sync should use Kite. */
export async function saveAppSession(data) {
  await connectDB()
  await MarketMeta.findOneAndUpdate({ key: 'kite' }, { key: 'kite', accessTokenEnc: encrypt(data.access_token), expiresAt: nextExpiry() }, { upsert: true, setDefaultsOnInsert: true })
}

/** Returns the decrypted token, or null when there is none or it has expired. */
export async function getAppToken() {
  await connectDB()
  const m = await MarketMeta.findOne({ key: 'kite' }).select('+accessTokenEnc')
  if (!m?.accessTokenEnc || (m.expiresAt && m.expiresAt < new Date())) return null
  return decrypt(m.accessTokenEnc)
}
