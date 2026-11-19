import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import SyncDoc from '@/models/SyncDoc'
import { requireAuth, rateLimitOrRespond, safeErrorResponse } from '@/lib/middleware/api'
import { parseOps } from '@/lib/sync/validate'

const PAGE = 500

/**
 * GET  /api/sync?since=<rev>[&afterId=<id>]   changes after a point, oldest first. `more` says to ask again with `next`.
 * POST /api/sync { ops: [{ table, key, data } | { table, key, deleted: true }] }   store changes, returns { rev }.
 * Everything is scoped to the signed-in user. The server never looks inside a record (vault items are ciphertext).
 */
export async function GET(request) {
  const limited = rateLimitOrRespond(request, { name: 'sync-pull', limit: 240, windowMs: 60_000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  try {
    await connectDB()
    const url = new URL(request.url)
    const since = Math.max(0, Number(url.searchParams.get('since')) || 0)
    const afterId = url.searchParams.get('afterId')
    const filter = { userId: user._id }
    if (afterId && /^[a-f0-9]{24}$/i.test(afterId)) filter.$or = [{ rev: { $gt: since } }, { rev: since, _id: { $gt: afterId } }]
    else filter.rev = { $gt: since }
    const rows = await SyncDoc.find(filter).sort({ rev: 1, _id: 1 }).limit(PAGE + 1).lean()
    const more = rows.length > PAGE
    const page = more ? rows.slice(0, PAGE) : rows
    const last = page[page.length - 1]
    return NextResponse.json({
      changes: page.map((r) => ({ table: r.table, key: r.key, data: r.deleted ? null : r.data, deleted: !!r.deleted, rev: r.rev })),
      more,
      next: last ? { since: last.rev, afterId: String(last._id) } : null,
      now: Date.now(),
    })
  } catch (error) {
    return safeErrorResponse(error)
  }
}

export async function POST(request) {
  const limited = rateLimitOrRespond(request, { name: 'sync-push', limit: 120, windowMs: 60_000 })
  if (limited) return limited
  const { user, response } = await requireAuth()
  if (response) return response
  const parsed = parseOps(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  try {
    await connectDB()
    const rev = Date.now()
    if (parsed.ops.length) {
      await SyncDoc.bulkWrite(parsed.ops.map((o) => ({
        updateOne: {
          filter: { userId: user._id, table: o.table, key: o.key },
          update: { $set: o.deleted ? { deleted: true, data: null, rev } : { deleted: false, data: o.data, rev } },
          upsert: true,
        },
      })), { ordered: false })
    }
    return NextResponse.json({ rev })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
