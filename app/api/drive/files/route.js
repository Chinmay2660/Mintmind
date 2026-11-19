import { NextResponse } from 'next/server'
import { featureGate } from '@/lib/features/server'
import connectDB from '@/lib/mongodb'
import DriveDocument from '@/models/DriveDocument'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { CATEGORIES, driveErrorResponse, ensureFolders, getAccessToken, uploadFile } from '@/lib/google/drive'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED = /^(application\/pdf|image\/(png|jpe?g|webp|heic)|text\/plain|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel))$/

export async function GET(request) {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'documents'); if (gate) return gate }
  await connectDB()
  // Paged on the server: page and limit (at most 50), optionally narrowed by category and a text search q.
  const sp = new URL(request.url).searchParams
  const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '12', 10) || 12))
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
  const filter = { userId: user._id }
  const category = sp.get('category')
  if (category && CATEGORIES.includes(category)) filter.category = category
  const q = (sp.get('q') || '').trim().slice(0, 80)
  if (q) {
    // every word has to appear in the name, file name, category or notes
    const words = q.split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    filter.$and = words.map((w) => ({ $or: ['name', 'fileName', 'category', 'notes'].map((k) => ({ [k]: { $regex: w, $options: 'i' } })) }))
  }
  const [total, docs] = await Promise.all([
    DriveDocument.countDocuments(filter),
    DriveDocument.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
  ])
  return NextResponse.json({ total, page, limit, documents: docs.map((d) => ({ id: d._id.toString(), name: d.name, fileName: d.fileName, category: d.category, mimeType: d.mimeType, size: d.size, notes: d.notes, uploaded: d.createdAt })) })
}

export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'drive-upload', limit: 30, windowMs: 60_000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'documents'); if (gate) return gate }
  try {
    const form = await request.formData()
    const file = form.get('file')
    const name = String(form.get('name') || '').trim()
    const category = String(form.get('category') || '')
    const notes = String(form.get('notes') || '').trim()
    if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File is larger than 25 MB' }, { status: 413 })
    if (!ALLOWED.test(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })

    await connectDB()
    const { token, conn } = await getAccessToken(user._id)
    const folders = await ensureFolders(token, conn)
    const up = await uploadFile(token, { name: file.name, mimeType: file.type, bytes: await file.arrayBuffer(), parent: folders[category] })
    const doc = await DriveDocument.create({ userId: user._id, driveFileId: up.id, name, fileName: file.name, category, mimeType: file.type, size: file.size, notes: notes || undefined })
    return NextResponse.json({ id: doc._id.toString() })
  } catch (e) {
    return driveErrorResponse(e)
  }
}
