// Zero-knowledge vault crypto built on the browser's WebCrypto (audited, native):
//   master password --PBKDF2-SHA256 (600k iterations, random salt)--> 256-bit key --AES-256-GCM--> items
// The master password and derived key never leave the device and are never stored.
const enc = new TextEncoder()
const dec = new TextDecoder()

export const PBKDF2_ITERATIONS = 600000
const VERIFIER_TEXT = 'mintmind-vault-v1'

export const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n))

async function pbkdf2Bits(secret, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256)
}

export const importAesKey = (raw, usages = ['encrypt', 'decrypt']) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, usages)

/** Derive raw 32-byte master key material from the password. */
export const deriveMasterBits = (password, saltB64, iterations = PBKDF2_ITERATIONS) => pbkdf2Bits(password, unb64(saltB64), iterations)

export async function encryptBytes(key, bytes) {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)
  return { iv: b64(iv), ct: b64(ct) }
}

export async function decryptBytes(key, { iv, ct }) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct))
}

export const encryptJson = (key, obj) => encryptBytes(key, enc.encode(JSON.stringify(obj)))
export async function decryptJson(key, blob) {
  return JSON.parse(dec.decode(await decryptBytes(key, blob)))
}

/** Create vault metadata + recovery key for a new master password. Returns { meta, key, recoveryKey }. */
export async function createVault(password) {
  const salt = b64(randomBytes(16))
  const bits = await deriveMasterBits(password, salt)
  const key = await importAesKey(bits)
  const verifier = await encryptBytes(key, enc.encode(VERIFIER_TEXT))
  const recoveryKey = generateRecoveryKey()
  const recoverySalt = b64(randomBytes(16))
  const recKey = await importAesKey(await deriveMasterBits(recoveryKey, recoverySalt))
  const recovery = { salt: recoverySalt, ...(await encryptBytes(recKey, bits)) } // master key wrapped by the recovery key
  return { meta: { v: 1, salt, iterations: PBKDF2_ITERATIONS, verifier, recovery, createdAt: new Date().toISOString() }, key, recoveryKey, bits }
}

export async function unlockVault(meta, password) {
  const bits = await deriveMasterBits(password, meta.salt, meta.iterations)
  const key = await importAesKey(bits)
  try {
    const t = dec.decode(await decryptBytes(key, meta.verifier))
    if (t !== VERIFIER_TEXT) return null
  } catch {
    return null
  }
  return { key, bits }
}

/** Unlock with the recovery key, then re-wrap everything under a new master password. */
export async function recoverVault(meta, recoveryKey, newPassword) {
  let bits
  try {
    const recKey = await importAesKey(await deriveMasterBits(recoveryKey.trim().toUpperCase(), meta.recovery.salt))
    bits = await decryptBytes(recKey, meta.recovery)
  } catch {
    return null
  }
  const salt = b64(randomBytes(16))
  const newBits = await deriveMasterBits(newPassword, salt)
  const newKey = await importAesKey(newBits)
  const oldKey = await importAesKey(bits)
  return { oldKey, newKey, newBits, salt }
}

export function generateRecoveryKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no look-alike chars
  const bytes = randomBytes(24)
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length])
  return [0, 6, 12, 18].map((i) => chars.slice(i, i + 6).join('')).join('-')
}

export function generatePassword({ length = 20, lower = true, upper = true, digits = true, symbols = true } = {}) {
  const sets = [lower && 'abcdefghijkmnopqrstuvwxyz', upper && 'ABCDEFGHJKLMNPQRSTUVWXYZ', digits && '23456789', symbols && '!@#$%^&*-_=+?'].filter(Boolean)
  if (!sets.length) return ''
  const all = sets.join('')
  const pick = (s) => {
    // rejection sampling: no modulo bias
    const max = Math.floor(256 / s.length) * s.length
    let b
    do b = randomBytes(1)[0]
    while (b >= max)
    return s[b % s.length]
  }
  const out = sets.map(pick) // guarantee one of each selected class
  while (out.length < length) out.push(pick(all))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor((randomBytes(4).reduce((a, b) => a * 256 + b, 0) / 2 ** 32) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join('')
}

/** Heuristic strength 0-4 from length, character classes and obvious patterns (entropy-based, offline). */
export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: 'Empty', bits: 0 }
  let pool = 0
  if (/[a-z]/.test(pw)) pool += 26
  if (/[A-Z]/.test(pw)) pool += 26
  if (/\d/.test(pw)) pool += 10
  if (/[^A-Za-z0-9]/.test(pw)) pool += 32
  let bits = pw.length * Math.log2(Math.max(pool, 2))
  if (/(.)\1{2,}/.test(pw)) bits -= 8
  if (/(0123|1234|2345|abcd|qwer|asdf|password|letmein|admin)/i.test(pw)) bits -= 15
  if (new Set(pw).size < pw.length / 2) bits -= 10
  bits = Math.max(0, Math.round(bits))
  const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4
  return { score, bits, label: ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][score] }
}

// ---------- Biometric unlock (WebAuthn PRF) ----------
export const biometricSupported = async () => {
  try {
    return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()))
  } catch {
    return false
  }
}

const PRF_SALT = enc.encode('mintmind-vault-prf-v1')

/** Registers a platform credential and wraps the master key with a PRF-derived secret. Throws if PRF unsupported. */
export async function enableBiometric(bits, userLabel = 'Mintmind vault') {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'Mintmind' },
      user: { id: randomBytes(16), name: userLabel, displayName: userLabel },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      extensions: { prf: { eval: { first: PRF_SALT } } },
    },
  })
  const ext = cred.getClientExtensionResults()
  let prf = ext.prf?.results?.first
  if (!prf) {
    // some authenticators only return PRF on assertion
    const asr = await navigator.credentials.get({ publicKey: { challenge: randomBytes(32), allowCredentials: [{ type: 'public-key', id: cred.rawId }], userVerification: 'required', extensions: { prf: { eval: { first: PRF_SALT } } } } })
    prf = asr.getClientExtensionResults().prf?.results?.first
  }
  if (!prf) throw new Error('This device does not support biometric key derivation (WebAuthn PRF).')
  const wrapKey = await importAesKey(await crypto.subtle.digest('SHA-256', prf))
  return { credentialId: b64(cred.rawId), wrapped: await encryptBytes(wrapKey, bits) }
}

export async function unlockWithBiometric(bio) {
  const asr = await navigator.credentials.get({ publicKey: { challenge: randomBytes(32), allowCredentials: [{ type: 'public-key', id: unb64(bio.credentialId) }], userVerification: 'required', extensions: { prf: { eval: { first: PRF_SALT } } } } })
  const prf = asr.getClientExtensionResults().prf?.results?.first
  if (!prf) return null
  try {
    const wrapKey = await importAesKey(await crypto.subtle.digest('SHA-256', prf))
    const bits = await decryptBytes(wrapKey, bio.wrapped)
    return { key: await importAesKey(bits), bits }
  } catch {
    return null
  }
}

// ---------- Emergency bundle (Digital Legacy) ----------
// Owner picks vault items -> encrypted under a random Emergency Access Key (EAK) that the owner hands to the
// contact offline. The server only ever stores ciphertext; neither the server nor family can read it.
export async function createEmergencyBundle(items) {
  const accessKey = generateRecoveryKey()
  const salt = b64(randomBytes(16))
  const key = await importAesKey(await deriveMasterBits(accessKey, salt, 310000))
  const { iv, ct } = await encryptJson(key, items)
  return { accessKey, bundle: { iv, ct: `${salt}.${ct}` } }
}

export async function openEmergencyBundle(bundle, accessKey) {
  const [salt, ct] = String(bundle.ct).split('.')
  const key = await importAesKey(await deriveMasterBits(accessKey.trim().toUpperCase(), salt, 310000))
  return decryptJson(key, { iv: bundle.iv, ct })
}
