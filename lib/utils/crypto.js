import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const DEV_KEY = 'mintmind-dev-key-change-in-prod!!';

/**
 * The key comes from ENCRYPTION_KEY. In production it must be set and long enough, so there is never a key
 * that anyone who can read the source code also knows. Only local development may fall back to a fixed key.
 */
export function getKey(env = process.env) {
  const secret = env.ENCRYPTION_KEY;
  if (!secret) {
    if (env.NODE_ENV === 'production') throw new Error('ENCRYPTION_KEY must be set in production');
    return crypto.createHash('sha256').update(DEV_KEY).digest();
  }
  if (env.NODE_ENV === 'production' && secret.length < 32) throw new Error('ENCRYPTION_KEY must be at least 32 characters in production');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(payload) {
  const [ivHex, tagHex, encrypted] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/** Objects are stored as an encrypted string, so the database holds nothing readable. */
export const encryptJson = (value) => encrypt(JSON.stringify(value));
export const decryptJson = (payload) => { try { return JSON.parse(decrypt(payload)); } catch { return null; } };

/** A one-way fingerprint for bearer tokens: the database keeps this, never the token itself. */
export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
