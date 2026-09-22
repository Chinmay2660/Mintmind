import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import { readUserFile } from '@/lib/storage';

export async function GET(request, { params }) {
  try {
    const { key } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const doc = await Document.findOne({ userId: user._id, storageKey: key });
    if (!doc) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await readUserFile(user._id, key);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${doc.fileName || 'document'}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch file');
  }
}
