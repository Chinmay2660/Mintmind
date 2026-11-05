import { NextResponse } from 'next/server'
import { featureGate } from '@/lib/features/server'
import connectDB from '@/lib/mongodb'
import DriveDocument from '@/models/DriveDocument'
import { requireAuth, rateLimitOrRespond } from '@/lib/middleware/api'
import { CATEGORIES, driveErrorResponse, ensureFolders, getAccessToken, uploadFile } from '@/lib/google/drive'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED = /^(application\/pdf|image\/(png|jpe?g|webp|heic)|text\/plain|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel))$/

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'documents'); if (gate) return gate }
  await connectDB()
  const docs = await DriveDocument.find({ userId: user._id }).sort({ createdAt: -1 })
  return NextResponse.json({ documents: docs.map((d) => ({ id: d._id.toString(), name: d.name, fileName: d.fileName, category: d.category, mimeType: d.mimeType, size: d.size, notes: d.notes, uploaded: d.createdAt })) })
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
