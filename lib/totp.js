import crypto from 'crypto'

// RFC 6238 TOTP (SHA-1, 6 digits, 30s) - compatible with Google Authenticator, Authy, 1Password.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateSecret(bytes = 20) {
  const buf = crypto.randomBytes(bytes)
  let bits = ''
  for (const b of buf) bits += b.toString(2).padStart(8, '0')
  let out = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]
  return out
}

function b32decode(s) {
  let bits = ''
  for (const c of s.replace(/=+$/, '').toUpperCase()) {
    const v = B32.indexOf(c)
    if (v < 0) continue
    bits += v.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

export function totpAt(secret, time = Date.now()) {
  const counter = Math.floor(time / 1000 / 30)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const h = crypto.createHmac('sha1', b32decode(secret)).update(buf).digest()
  const o = h[h.length - 1] & 0xf
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(code % 1e6).padStart(6, '0')
}

/** Accepts the current code and +/- one step for clock drift. */
export function verifyTotp(secret, token, time = Date.now()) {
  const t = String(token || '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(t)) return false
  let ok = false
  for (const drift of [-1, 0, 1]) {
    const expected = totpAt(secret, time + drift * 30000)
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(t))) ok = true
  }
  return ok
}

export function otpauthUrl(secret, account, issuer = 'Mintmind') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}
