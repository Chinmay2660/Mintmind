import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import PasswordEntry from '@/models/PasswordEntry';
import { encrypt, decrypt } from '@/lib/utils/crypto';

const FIELDS = ['service', 'username', 'password', 'url', 'category', 'tagIds', 'notes'];

function toSafeEntry(item) {
  const obj = item.toObject ? item.toObject() : item;
  obj.password = decrypt(obj.encryptedPassword);
  delete obj.encryptedPassword;
  return obj;
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const item = await PasswordEntry.findOne({ _id: id, userId: user._id });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(toSafeEntry(item));
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch password');
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
    const update = { ...data };
    if (data.password) {
      update.encryptedPassword = encrypt(data.password);
      delete update.password;
    }
    const item = await PasswordEntry.findOneAndUpdate({ _id: id, userId: user._id }, update, { new: true });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(toSafeEntry(item));
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update password');
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const item = await PasswordEntry.findOneAndDelete({ _id: id, userId: user._id });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete password');
  }
}
