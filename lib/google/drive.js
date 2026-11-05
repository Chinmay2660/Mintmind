import { NextResponse } from 'next/server'
import DriveConnection from '@/models/DriveConnection'
import { decrypt, encrypt } from '@/lib/utils/crypto'

// Minimum scope: drive.file = only files/folders this app creates. No access to the rest of the user's Drive.
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const ROOT_FOLDER = 'My Wealth App'
export const CATEGORIES = ['Personal', 'Identity', 'Bank', 'Investment', 'Insurance', 'Property', 'Family']

export function driveConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  return { clientId, clientSecret, appUrl, redirectUri: `${appUrl}/api/drive/callback`, configured: !!(clientId && clientSecret) }
}

export function buildAuthUrl(state) {
  const c = driveConfig()
  const q = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: 'code',
    scope: `${DRIVE_SCOPE} openid email`,
    access_type: 'offline',
    prompt: 'consent', // guarantees a refresh token
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

async function tokenRequest(params) {
  const c = driveConfig()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...params }),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

export async function exchangeCode(code) {
  const c = driveConfig()
  return tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: c.redirectUri })
}

export class DriveAuthError extends Error {
  constructor(message = 'Google Drive authorisation expired') {
    super(message)
    this.code = 'DRIVE_AUTH'
  }
}

/** Returns a short-lived access token; flags the connection as expired when Google rejects the refresh token. */
export async function getAccessToken(userId) {
  const conn = await DriveConnection.findOne({ userId }).select('+refreshTokenEnc')
  if (!conn) throw new DriveAuthError('Google Drive is not connected')
  if (conn.status === 'expired') throw new DriveAuthError()
  const { ok, json } = await tokenRequest({ grant_type: 'refresh_token', refresh_token: decrypt(conn.refreshTokenEnc) })
  if (!ok) {
    if (json.error === 'invalid_grant') {
      conn.status = 'expired'
      await conn.save()
      throw new DriveAuthError()
    }
    throw new Error('Could not refresh Google token')
  }
  return { token: json.access_token, conn }
}

export async function revokeToken(userId) {
  const conn = await DriveConnection.findOne({ userId }).select('+refreshTokenEnc')
  if (!conn) return
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(conn.refreshTokenEnc))}`, { method: 'POST' })
  } catch {
    /* best effort */
  }
}

export async function saveConnection(userId, { refreshToken, scope, email }) {
  return DriveConnection.findOneAndUpdate(
    { userId },
    { userId, refreshTokenEnc: encrypt(refreshToken), scope, email, status: 'connected', rootFolderId: undefined, folders: {} },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

async function gfetch(token, url, init = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } })
  if (res.status === 401) throw new DriveAuthError()
  return res
}

async function createFolder(token, name, parent) {
  const res = await gfetch(token, 'https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }),
  })
  if (!res.ok) throw new Error('Could not create Drive folder')
  return (await res.json()).id
}

async function folderExists(token, id) {
  const res = await gfetch(token, `https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed`)
  if (!res.ok) return false
  return !(await res.json()).trashed
}

/** Creates "My Wealth App/{Personal,Identity,...}" once per user and remembers the folder ids. */
export async function ensureFolders(token, conn) {
  let changed = false
  if (!conn.rootFolderId || !(await folderExists(token, conn.rootFolderId))) {
    conn.rootFolderId = await createFolder(token, ROOT_FOLDER)
    conn.folders = {}
    changed = true
  }
  const folders = { ...(conn.folders || {}) }
  for (const cat of CATEGORIES) {
    if (!folders[cat] || !(await folderExists(token, folders[cat]))) {
      folders[cat] = await createFolder(token, cat, conn.rootFolderId)
      changed = true
    }
  }
  if (changed) {
    conn.folders = folders
    conn.markModified('folders')
    await conn.save()
  }
  return conn.folders
}

export async function uploadFile(token, { name, mimeType, bytes, parent }) {
  const boundary = `mm${Date.now()}${Math.random().toString(36).slice(2)}`
  const meta = JSON.stringify({ name, ...(parent ? { parents: [parent] } : {}) })
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--`),
  ])
  const res = await gfetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size,mimeType', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  if (!res.ok) throw new Error('Drive upload failed')
  return res.json()
}

export async function replaceFile(token, fileId, { mimeType, bytes }) {
  const res = await gfetch(token, `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,size,mimeType`, {
    method: 'PATCH',
    headers: { 'Content-Type': mimeType || 'application/octet-stream' },
    body: Buffer.from(bytes),
  })
  if (!res.ok) throw new Error('Drive replace failed')
  return res.json()
}

export const downloadFile = (token, fileId) => gfetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`)
export const deleteDriveFile = (token, fileId) => gfetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}`, { method: 'DELETE' })
export const moveFile = (token, fileId, from, to) =>
  gfetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${to}&removeParents=${from}`, { method: 'PATCH' })

export function driveErrorResponse(e) {
  if (e instanceof DriveAuthError) return NextResponse.json({ error: e.message, code: 'DRIVE_AUTH' }, { status: 409 })
  console.error(e)
  return NextResponse.json({ error: 'Google Drive request failed' }, { status: 502 })
}
