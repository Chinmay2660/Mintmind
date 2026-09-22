import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';

const FIELDS = ['name', 'email', 'phone', 'relationship', 'notes'];

export async function GET() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const nominee = await Nominee.findOne({ userId: user._id });
    return NextResponse.json(nominee);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch nominee');
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const body = await request.json();
    const data = pick(body, FIELDS);
    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'Nominee name is required' }, { status: 400 });
    }
    if (!data.email?.trim()) {
      return NextResponse.json({ error: 'Nominee email is required' }, { status: 400 });
    }
    const nominee = await Nominee.findOneAndUpdate(
      { userId: user._id },
      { ...data, userId: user._id },
      { new: true, upsert: true }
    );
    return NextResponse.json(nominee);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to save nominee');
  }
}

export async function DELETE() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    await Nominee.findOneAndDelete({ userId: user._id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete nominee');
  }
}
