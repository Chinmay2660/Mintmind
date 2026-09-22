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

export async function GET() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const items = await PasswordEntry.find({ userId: user._id }).sort({ service: 1 });
    return NextResponse.json(items.map(toSafeEntry));
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch passwords');
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const body = await request.json();
    const data = pick(body, FIELDS);
    if (!data.service || !data.password) {
      return NextResponse.json({ error: 'Service and password are required' }, { status: 400 });
    }
    const { password, ...rest } = data;
    const item = await PasswordEntry.create({
      ...rest,
      encryptedPassword: encrypt(password),
      userId: user._id,
    });
    return NextResponse.json(toSafeEntry(item));
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create password entry');
  }
}
