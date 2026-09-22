import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import { saveUserFile } from '@/lib/storage';

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get('file');
    const name = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || 'other');
    const notes = String(formData.get('notes') || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Document name is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const saved = await saveUserFile(user._id, file);
    const doc = await Document.create({
      userId: user._id,
      name,
      category,
      notes: notes || undefined,
      ...saved,
    });

    return NextResponse.json(doc);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to upload document');
  }
}
