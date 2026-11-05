import { NextResponse } from 'next/server'
import { featureGate } from '@/lib/features/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import DriveDocument from '@/models/DriveDocument'
import { requireAuth } from '@/lib/middleware/api'
import { CATEGORIES, deleteDriveFile, downloadFile, driveErrorResponse, ensureFolders, getAccessToken, moveFile, replaceFile } from '@/lib/google/drive'

async function load(userId, id) {
  if (!mongoose.isValidObjectId(id)) return null
  await connectDB()
  // ownership enforced in the query: one user can never address another user's document
  return DriveDocument.findOne({ _id: id, userId })
}

/** Stream a file through the server (token never leaves it). ?download=1 forces attachment. */
export async function GET(request, { params }) {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'documents'); if (gate) return gate }
  const { id } = await params
  const doc = await load(user._id, id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const { token } = await getAccessToken(user._id)
    const res = await downloadFile(token, doc.driveFileId)
    if (!res.ok) return NextResponse.json({ error: 'File not available in Drive' }, { status: 404 })
    const dl = new URL(request.url).searchParams.get('download') === '1'
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `${dl ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(doc.fileName || doc.name)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      },
    })
  } catch (e) {
    return driveErrorResponse(e)
  }
}

/** Replace file content (multipart: file) and/or update metadata (name, notes, category). */
export async function PUT(request, { params }) {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'documents'); if (gate) return gate }
  const { id } = await params
  const doc = await load(user._id, id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const form = await request.formData()
    const file = form.get('file')
    const name = form.get('name') ? String(form.get('name')).trim() : null
    const category = form.get('category') ? String(form.get('category')) : null
    const notes = form.get('notes') != null ? String(form.get('notes')) : null
    const { token, conn } = await getAccessToken(user._id)
    if (file instanceof File && file.size) {
      if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'File is larger than 25 MB' }, { status: 413 })
      const r = await replaceFile(token, doc.driveFileId, { mimeType: file.type, bytes: await file.arrayBuffer() })
      doc.size = Number(r.size) || file.size
      doc.mimeType = file.type
      doc.fileName = file.name
    }
    if (category && category !== doc.category) {
      if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      const folders = await ensureFolders(token, conn)
      await moveFile(token, doc.driveFileId, folders[doc.category], folders[category])
      doc.category = category
    }
    if (name) doc.name = name
    if (notes !== null) doc.notes = notes
    await doc.save()
    return NextResponse.json({ success: true })
  } catch (e) {
    return driveErrorResponse(e)
  }
}

export async function DELETE(_request, { params }) {
  const { user, response } = await requireAuth()
  if (response) return response
  { const gate = await featureGate(user._id, 'documents'); if (gate) return gate }
  const { id } = await params
  const doc = await load(user._id, id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const { token } = await getAccessToken(user._id)
    const r = await deleteDriveFile(token, doc.driveFileId)
    if (!r.ok && r.status !== 404) return NextResponse.json({ error: 'Could not delete from Drive' }, { status: 502 })
    await doc.deleteOne()
    return NextResponse.json({ success: true })
  } catch (e) {
    return driveErrorResponse(e)
  }
}
