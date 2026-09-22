import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// ponytail: local disk storage; swap lib/storage for S3 in multi-instance deploys
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'storage/uploads';
const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024);

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function getMaxUploadBytes() {
  return MAX_BYTES;
}

export async function ensureUploadDir(userId) {
  const dir = path.join(process.cwd(), UPLOAD_DIR, String(userId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function isAllowedMime(mimeType) {
  return ALLOWED_MIME.has(mimeType);
}

export async function saveUserFile(userId, file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('No file provided');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)}MB)`);
  }
  if (!isAllowedMime(file.type)) {
    throw new Error('File type not allowed. Use PDF, JPEG, PNG, or Word documents.');
  }

  const dir = await ensureUploadDir(userId);
  const ext = path.extname(file.name || '').slice(0, 16);
  const key = `${crypto.randomUUID()}${ext}`;
  const absPath = path.join(dir, key);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absPath, buffer);

  return {
    storageKey: key,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    fileUrl: `/api/documents/file/${key}`,
  };
}

export function resolveUserFilePath(userId, storageKey) {
  const safeKey = path.basename(storageKey);
  return path.join(process.cwd(), UPLOAD_DIR, String(userId), safeKey);
}

export async function deleteUserFile(userId, storageKey) {
  if (!storageKey) return;
  try {
    await fs.unlink(resolveUserFilePath(userId, storageKey));
  } catch {
    // ponytail: missing file on disk is fine
  }
}

export async function readUserFile(userId, storageKey) {
  const absPath = resolveUserFilePath(userId, storageKey);
  return fs.readFile(absPath);
}
