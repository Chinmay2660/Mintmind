import Document from '@/models/Document';
import connectDB from '@/lib/mongodb';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import { NextResponse } from 'next/server';
import { deleteUserFile } from '@/lib/storage';

const FIELDS = ['name', 'category', 'tagIds', 'fileUrl', 'fileName', 'fileSize', 'mimeType', 'notes'];

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const item = await Document.findOne({ _id: id, userId: user._id });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch Document');
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const body = await request.json();
    const data = pick(body, FIELDS);
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const item = await Document.findOneAndUpdate({ _id: id, userId: user._id }, data, { new: true });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update Document');
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const item = await Document.findOneAndDelete({ _id: id, userId: user._id });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (item.storageKey) {
      await deleteUserFile(user._id, item.storageKey);
    }
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete Document');
  }
}
