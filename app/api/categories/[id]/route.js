import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import Category from '@/models/Category';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const CATEGORY_FIELDS = ['name', 'type', 'icon', 'color', 'budget'];

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, CATEGORY_FIELDS);

    const category = await Category.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      data,
      { new: true }
    );

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update category');
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const category = await Category.findOneAndDelete({ _id: params.id, userId: user._id });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Category deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete category');
  }
}
