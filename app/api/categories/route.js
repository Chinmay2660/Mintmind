import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import Category from '@/models/Category';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const CATEGORY_FIELDS = ['name', 'type', 'icon', 'color', 'budget'];

export async function GET(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const query = { userId: user._id };
    if (type) {
      query.type = type;
    }

    const categories = await Category.find(query).sort({ createdAt: -1 });
    return NextResponse.json(categories);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch categories');
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, CATEGORY_FIELDS);

    if (!data.name || !data.type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const category = await Category.create({
      ...data,
      userId: user._id,
    });

    return NextResponse.json(category);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create category');
  }
}
