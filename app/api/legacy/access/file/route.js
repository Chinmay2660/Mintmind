import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LegacyPlan from '@/models/LegacyPlan';
import Document from '@/models/Document';
import { readUserFile } from '@/lib/storage';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const key = searchParams.get('key');
    if (!token || !key) {
      return NextResponse.json({ error: 'Token and file key required' }, { status: 400 });
    }

    await connectDB();
    const plan = await LegacyPlan.findOne({ accessToken: token, released: true });
    if (!plan) {
      return NextResponse.json({ error: 'Invalid access' }, { status: 404 });
    }

    const doc = await Document.findOne({ userId: plan.userId, storageKey: key });
    if (!doc || !plan.accessScopes?.documents) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await readUserFile(plan.userId, key);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${doc.fileName || 'document'}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
